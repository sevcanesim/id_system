create or replace function public.get_public_profile_physical_state(p_profile_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (
      select 1
      from public.physical_cards pc
      where pc.owner_profile_id = p_profile_id
    ) then 'NOT_PHYSICAL'
    when exists (
      select 1
      from public.physical_cards pc
      where pc.owner_profile_id = p_profile_id
        and pc.status = 'ACTIVE'
    ) then 'ACTIVE'
    when exists (
      select 1
      from public.physical_cards pc
      where pc.owner_profile_id = p_profile_id
        and pc.status = 'LOST'
    ) then 'LOST'
    else 'DISABLED'
  end;
$$;

revoke all on function public.get_public_profile_physical_state(uuid) from public;
grant execute on function public.get_public_profile_physical_state(uuid) to anon, authenticated, service_role;

comment on function public.get_public_profile_physical_state(uuid) is
  'Returns only the aggregate physical-card access state for a public profile. Public profile readers use this to fail closed when every bound physical card is lost or disabled without exposing physical_cards rows.';
