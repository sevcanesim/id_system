-- Public event URLs need exact-id resolution, not anonymous table enumeration.
-- Keep manager reads intact while removing the permissive anon SELECT path.

drop policy if exists "Public can resolve event links" on public.networking_event_links;
revoke select on table public.networking_event_links from anon;

grant select on table public.networking_event_links to authenticated;
grant all on table public.networking_event_links to service_role;

create or replace function public.resolve_public_networking_event_link(p_public_id text)
returns table(
  id uuid,
  event_id uuid,
  profile_id uuid,
  event_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    link.id,
    link.event_id,
    link.profile_id,
    event.name
  from public.networking_event_links link
  join public.networking_events event on event.id = link.event_id
  where link.public_id = nullif(trim(p_public_id), '')
  limit 1;
$$;

revoke all on function public.resolve_public_networking_event_link(text) from public;
grant execute on function public.resolve_public_networking_event_link(text) to anon, authenticated, service_role;
