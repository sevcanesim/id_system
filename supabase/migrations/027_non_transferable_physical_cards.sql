do $$ begin
  create type public.physical_card_status as enum ('UNASSIGNED','ACTIVE','LOST','DISABLED');
exception when duplicate_object then null; end $$;

create or replace function public.generate_physical_card_code()
returns text language plpgsql volatile set search_path = public as $$
declare candidate text;
begin
  loop
    candidate := 'YN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    exit when not exists(select 1 from public.physical_cards where card_code = candidate);
  end loop;
  return candidate;
end;
$$;

create table if not exists public.physical_cards (
  id uuid primary key default gen_random_uuid(),
  card_code text not null unique default public.generate_physical_card_code(),
  owner_profile_id uuid references public.card_profiles(id) on delete restrict,
  owner_user_id uuid references auth.users(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete set null,
  entitlement_id uuid unique references public.entitlements(id) on delete restrict,
  activated_at timestamptz,
  status public.physical_card_status not null default 'UNASSIGNED',
  replaced_by_card_id uuid unique references public.physical_cards(id) on delete restrict,
  lost_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physical_cards_code_format check(card_code ~ '^YN-[A-Z0-9]{12}$'),
  constraint physical_cards_activation_shape check(
    (status = 'UNASSIGNED' and owner_profile_id is null and owner_user_id is null and activated_at is null)
    or (status <> 'UNASSIGNED' and owner_profile_id is not null and owner_user_id is not null and activated_at is not null)
  ),
  constraint physical_cards_not_self_replaced check(replaced_by_card_id is null or replaced_by_card_id <> id)
);

create index if not exists physical_cards_owner_profile_idx on public.physical_cards(owner_profile_id);
create index if not exists physical_cards_owner_user_idx on public.physical_cards(owner_user_id);
create index if not exists physical_cards_organization_idx on public.physical_cards(organization_id);

create or replace function public.enforce_non_transferable_physical_card()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.activated_at is not null and (
    new.owner_profile_id is distinct from old.owner_profile_id
    or new.owner_user_id is distinct from old.owner_user_id
    or new.entitlement_id is distinct from old.entitlement_id
  ) then
    raise exception 'ACTIVATED_CARD_OWNER_IS_IMMUTABLE';
  end if;
  if old.replaced_by_card_id is not null and new.status = 'ACTIVE' then
    raise exception 'REPLACED_CARD_CANNOT_BE_REACTIVATED';
  end if;
  new.updated_at := now();
  new.lost_at := case when new.status = 'LOST' then coalesce(old.lost_at, now()) else null end;
  new.disabled_at := case when new.status = 'DISABLED' then coalesce(old.disabled_at, now()) else null end;
  return new;
end;
$$;

drop trigger if exists physical_card_immutability on public.physical_cards;
create trigger physical_card_immutability before update on public.physical_cards
for each row execute function public.enforce_non_transferable_physical_card();

create or replace function public.activate_physical_card(
  p_card_code text, p_profile_id uuid, p_entitlement_id uuid, p_organization_id uuid default null
) returns public.physical_cards
language plpgsql security definer set search_path = public as $$
declare v_card public.physical_cards%rowtype; v_profile public.card_profiles%rowtype; v_entitlement public.entitlements%rowtype;
begin
  select * into v_card from public.physical_cards where card_code=upper(trim(p_card_code)) for update;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  if v_card.activated_at is not null or v_card.status <> 'UNASSIGNED' then raise exception 'CARD_ALREADY_ACTIVATED'; end if;
  select * into strict v_profile from public.card_profiles where id=p_profile_id;
  select * into strict v_entitlement from public.entitlements where id=p_entitlement_id;
  if v_profile.user_id <> v_entitlement.user_id then raise exception 'PROFILE_ENTITLEMENT_OWNER_MISMATCH'; end if;
  update public.physical_cards set owner_profile_id=v_profile.id,owner_user_id=v_profile.user_id,
    entitlement_id=v_entitlement.id,organization_id=p_organization_id,activated_at=now(),status='ACTIVE'
  where id=v_card.id returning * into v_card;
  return v_card;
end;
$$;

create or replace function public.replace_physical_card(p_old_card_id uuid,p_new_card_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare old_card public.physical_cards%rowtype; new_card public.physical_cards%rowtype;
begin
  select * into strict old_card from public.physical_cards where id=p_old_card_id for update;
  select * into strict new_card from public.physical_cards where id=p_new_card_id for update;
  if old_card.status not in ('LOST','DISABLED') then raise exception 'OLD_CARD_MUST_BE_INACTIVE'; end if;
  if new_card.status <> 'ACTIVE' or new_card.owner_profile_id <> old_card.owner_profile_id
    or new_card.owner_user_id <> old_card.owner_user_id then raise exception 'REPLACEMENT_OWNER_MISMATCH'; end if;
  if old_card.replaced_by_card_id is not null then raise exception 'CARD_ALREADY_REPLACED'; end if;
  update public.physical_cards set replaced_by_card_id=new_card.id where id=old_card.id;
end;
$$;

alter table public.physical_cards enable row level security;
drop policy if exists "Owners can read own physical cards" on public.physical_cards;
create policy "Owners can read own physical cards" on public.physical_cards for select to authenticated
using(owner_user_id=auth.uid());
drop policy if exists "Organization managers can read physical cards" on public.physical_cards;
create policy "Organization managers can read physical cards" on public.physical_cards for select to authenticated
using(organization_id is not null and public.is_active_organization_member(organization_id,array['OWNER','ADMIN','HR']));

create or replace function public.disable_cards_for_inactive_member()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and new.status in ('SUSPENDED','LEFT') and old.status is distinct from new.status then
    update public.physical_cards set status='DISABLED'
    where owner_user_id=new.user_id and organization_id=new.organization_id and status in ('ACTIVE','LOST');
  end if;
  return new;
end;
$$;

drop trigger if exists organization_member_card_shutdown on public.organization_members;
create trigger organization_member_card_shutdown after update of status on public.organization_members
for each row execute function public.disable_cards_for_inactive_member();

revoke all on function public.activate_physical_card(text,uuid,uuid,uuid) from public;
revoke all on function public.replace_physical_card(uuid,uuid) from public;
grant execute on function public.activate_physical_card(text,uuid,uuid,uuid) to service_role;
grant execute on function public.replace_physical_card(uuid,uuid) to service_role;

create or replace function public.change_physical_card_status(p_card_id uuid,p_status public.physical_card_status)
returns public.physical_cards
language plpgsql security definer set search_path = public as $$
declare v_card public.physical_cards%rowtype; v_is_manager boolean;
begin
  if p_status not in ('ACTIVE','LOST','DISABLED') then raise exception 'INVALID_CARD_STATUS'; end if;
  select * into v_card from public.physical_cards where id=p_card_id for update;
  if not found then raise exception 'CARD_NOT_FOUND'; end if;
  v_is_manager := v_card.organization_id is not null and
    public.is_active_organization_member(v_card.organization_id,array['OWNER','ADMIN','HR']);
  if auth.uid() <> v_card.owner_user_id and not v_is_manager then raise exception 'CARD_ACCESS_DENIED'; end if;
  if p_status='DISABLED' and not v_is_manager then raise exception 'ONLY_ORGANIZATION_MANAGER_CAN_DISABLE'; end if;
  update public.physical_cards set status=p_status where id=v_card.id returning * into v_card;
  return v_card;
end;
$$;

revoke all on function public.change_physical_card_status(uuid,public.physical_card_status) from public;
grant execute on function public.change_physical_card_status(uuid,public.physical_card_status) to authenticated;

-- Existing physical entitlements become permanently bound cards.
insert into public.physical_cards(owner_profile_id,owner_user_id,organization_id,entitlement_id,activated_at,status)
select cp.id,cp.user_id,(select om.organization_id from public.organization_members om
  where om.user_id=cp.user_id and om.status='ACTIVE' order by om.created_at limit 1),
  cp.entitlement_id,coalesce(cp.service_started_at,cp.created_at),
  case when cp.card_status='LOST' then 'LOST'::public.physical_card_status
       when cp.card_status='ACTIVE' then 'ACTIVE'::public.physical_card_status
       else 'DISABLED'::public.physical_card_status end
from public.card_profiles cp join public.entitlements e on e.id=cp.entitlement_id
where e.kind='NFC_PHYSICAL_CARD'
on conflict(entitlement_id) do nothing;
