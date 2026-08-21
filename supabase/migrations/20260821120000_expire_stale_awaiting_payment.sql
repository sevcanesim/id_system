-- Cancel abandoned AWAITING_PAYMENT orders that are older than 7 days,
-- have no PAID attempt, and have no PENDING attempt updated in the last 2 hours.
-- In-flight checkouts stay untouched. A PAID attempt on an unpaid order is a
-- reconciliation defect and is not cancelled here.

create or replace function public.expire_stale_awaiting_payment_orders(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_row record;
  v_now timestamptz:=now();
  v_checked integer:=0;
  v_cancelled integer:=0;
  v_skipped integer:=0;
begin
  for v_row in
    select o.id
    from public.commerce_orders o
    where o.status='AWAITING_PAYMENT'
      and o.created_at < v_now - interval '7 days'
      and not exists (
        select 1 from public.commerce_payment_attempts a
        where a.order_id=o.id and a.status='PAID'
      )
      and not exists (
        select 1 from public.commerce_payment_attempts a
        where a.order_id=o.id and a.status='PENDING' and a.updated_at >= v_now - interval '2 hours'
      )
    order by o.created_at asc
    limit greatest(1,least(coalesce(p_limit,100),500))
    for update skip locked
  loop
    v_checked:=v_checked+1;

    update public.commerce_orders
    set status='CANCELLED', updated_at=v_now
    where id=v_row.id and status='AWAITING_PAYMENT';
    if not found then
      v_skipped:=v_skipped+1;
      continue;
    end if;

    update public.commerce_payment_attempts
    set status='FAILED',
        error_code=coalesce(error_code,'STALE_AWAITING_EXPIRED'),
        error_message=coalesce(error_message,'Bekleyen ödeme süresi doldu.'),
        updated_at=v_now
    where order_id=v_row.id and status='PENDING';

    insert into public.commerce_order_status_history(order_id,from_status,to_status,source,note)
    values (v_row.id,'AWAITING_PAYMENT','CANCELLED','SYSTEM','7 günden eski bekleyen ödeme iptal edildi');

    v_cancelled:=v_cancelled+1;
  end loop;

  return jsonb_build_object('ok',true,'checked',v_checked,'cancelled',v_cancelled,'skipped',v_skipped);
end;
$$;

revoke all on function public.expire_stale_awaiting_payment_orders(integer) from public,anon,authenticated;
grant execute on function public.expire_stale_awaiting_payment_orders(integer) to service_role;
