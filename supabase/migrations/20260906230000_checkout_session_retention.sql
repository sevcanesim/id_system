create or replace function public.purge_expired_checkout_resume_data(p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_checkout_sessions_deleted integer := 0;
  v_resume_codes_deleted integer := 0;
begin
  if p_limit < 1 or p_limit > 5000 then
    raise exception 'INVALID_RETENTION_PURGE_LIMIT';
  end if;

  with candidates as (
    select order_id
    from public.commerce_checkout_sessions
    where expires_at <= now()
    order by expires_at asc
    limit p_limit
    for update skip locked
  ), deleted as (
    delete from public.commerce_checkout_sessions sessions
    using candidates
    where sessions.order_id = candidates.order_id
    returning sessions.order_id
  )
  select count(*) into v_checkout_sessions_deleted from deleted;

  with candidates as (
    select order_id
    from public.commerce_checkout_resume_codes
    where expires_at <= now()
      or (redeemed_at is not null and redeemed_at <= now() - interval '1 day')
    order by expires_at asc
    limit p_limit
    for update skip locked
  ), deleted as (
    delete from public.commerce_checkout_resume_codes codes
    using candidates
    where codes.order_id = candidates.order_id
    returning codes.order_id
  )
  select count(*) into v_resume_codes_deleted from deleted;

  return jsonb_build_object(
    'checkoutSessionsDeleted', v_checkout_sessions_deleted,
    'resumeCodesDeleted', v_resume_codes_deleted
  );
end;
$$;

revoke all on function public.purge_expired_checkout_resume_data(integer) from public, anon, authenticated;
grant execute on function public.purge_expired_checkout_resume_data(integer) to service_role;

comment on function public.purge_expired_checkout_resume_data(integer) is
  'Deletes expired checkout-resume snapshots and one-time codes. It never deletes paid-order invoice records.';
