-- Corporate physical cards may only reference a profile bound to the same organization.
-- Repair deterministic legacy rows before enforcing the invariant.
update public.physical_cards card
set owner_user_id = profile.user_id
from public.card_profiles profile
where card.owner_profile_id = profile.id
  and card.owner_user_id is null;

update public.physical_cards card
set organization_id = profile.organization_id
from public.card_profiles profile
where card.owner_profile_id = profile.id
  and card.organization_id is null
  and profile.organization_id is not null;

do $$
begin
  if exists (
    select 1
    from public.physical_cards card
    join public.card_profiles profile on profile.id = card.owner_profile_id
    where card.owner_user_id is distinct from profile.user_id
       or (card.organization_id is not null and profile.organization_id is distinct from card.organization_id)
       or (card.organization_id is null and profile.organization_id is not null)
  ) then
    raise exception 'CORPORATE_CARD_PROFILE_INTEGRITY_REPAIR_REQUIRED';
  end if;
end;
$$;

create or replace function public.enforce_physical_card_profile_scope()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  profile public.card_profiles%rowtype;
begin
  if new.owner_profile_id is null then
    return new;
  end if;

  select * into profile
  from public.card_profiles
  where id = new.owner_profile_id;

  if not found then
    raise exception 'CARD_PROFILE_NOT_FOUND';
  end if;

  if new.owner_user_id is distinct from profile.user_id then
    raise exception 'CARD_PROFILE_OWNER_MISMATCH';
  end if;

  if new.organization_id is not null and profile.organization_id is distinct from new.organization_id then
    raise exception 'CARD_PROFILE_ORGANIZATION_MISMATCH';
  end if;

  if new.organization_id is null and profile.organization_id is not null then
    raise exception 'CORPORATE_PROFILE_REQUIRES_CORPORATE_CARD';
  end if;

  return new;
end;
$$;

drop trigger if exists physical_card_profile_scope on public.physical_cards;
create trigger physical_card_profile_scope
before insert or update of owner_profile_id, owner_user_id, organization_id
on public.physical_cards
for each row
execute function public.enforce_physical_card_profile_scope();

create or replace function public.link_own_corporate_card_profile(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  linked_cards integer := 0;
begin
  if not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = p_actor_user_id
      and status = 'ACTIVE'
  ) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;

  if not exists (
    select 1
    from public.card_profiles
    where id = p_profile_id
      and user_id = p_actor_user_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'PROFILE_NOT_FOUND');
  end if;

  if not exists (
    select 1
    from public.card_profiles
    where id = p_profile_id
      and user_id = p_actor_user_id
      and organization_id = p_organization_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'PROFILE_ORGANIZATION_MISMATCH');
  end if;

  update public.physical_cards
  set owner_profile_id = p_profile_id
  where organization_id = p_organization_id
    and owner_user_id = p_actor_user_id
    and owner_profile_id is null;

  get diagnostics linked_cards = row_count;

  if linked_cards = 0 then
    return jsonb_build_object('ok', false, 'code', 'NO_UNLINKED_CARD');
  end if;

  return jsonb_build_object('ok', true, 'linked_cards', linked_cards);
end;
$$;

revoke all on function public.link_own_corporate_card_profile(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.link_own_corporate_card_profile(uuid, uuid, uuid) to service_role;

create or replace function public.activate_physical_card(
  p_card_code text,
  p_profile_id uuid,
  p_entitlement_id uuid,
  p_organization_id uuid default null
)
returns public.physical_cards
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  card public.physical_cards%rowtype;
  profile public.card_profiles%rowtype;
  entitlement public.entitlements%rowtype;
begin
  select * into card
  from public.physical_cards
  where card_code = upper(trim(p_card_code))
  for update;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  if card.activated_at is not null or card.status <> 'UNASSIGNED' then raise exception 'CARD_ALREADY_ACTIVATED'; end if;

  select * into strict profile from public.card_profiles where id = p_profile_id;
  select * into strict entitlement from public.entitlements where id = p_entitlement_id;

  if profile.user_id <> entitlement.user_id then raise exception 'PROFILE_ENTITLEMENT_OWNER_MISMATCH'; end if;
  if profile.organization_id is distinct from p_organization_id then raise exception 'CARD_PROFILE_ORGANIZATION_MISMATCH'; end if;

  update public.physical_cards
  set owner_profile_id = profile.id,
      owner_user_id = profile.user_id,
      entitlement_id = entitlement.id,
      organization_id = p_organization_id,
      activated_at = now(),
      status = 'ACTIVE'
  where id = card.id
  returning * into card;

  return card;
end;
$$;

revoke all on function public.activate_physical_card(text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.activate_physical_card(text, uuid, uuid, uuid) to service_role;

drop policy if exists "Users can insert their own profile" on public.card_profiles;
drop policy if exists "Users can update their own profile" on public.card_profiles;
drop policy if exists "Users can delete their own profile" on public.card_profiles;
revoke insert, update, delete on table public.card_profiles from public, anon, authenticated;
grant select on table public.card_profiles to authenticated;
