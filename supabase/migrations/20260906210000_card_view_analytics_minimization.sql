create or replace function public.purge_card_view_events(
  p_retention_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer := 0;
begin
  if p_retention_days < 30 or p_retention_days > 365 then
    raise exception 'INVALID_CARD_VIEW_RETENTION';
  end if;

  delete from public.card_view_events
  where viewed_at < now() - make_interval(days => p_retention_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_card_view_events(integer) from public, anon, authenticated;
grant execute on function public.purge_card_view_events(integer) to service_role;
