-- Database invariant: a commerce order may have at most one live payment session.
-- Do not guess which attempt is valid if production already contains duplicates;
-- deployment must stop so those provider sessions can be reconciled explicitly.

do $$
begin
  if exists (
    select 1
    from public.commerce_payment_attempts
    where status='PENDING'
    group by order_id
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_PENDING_COMMERCE_PAYMENT_ATTEMPTS_REQUIRE_RECONCILIATION';
  end if;
end;
$$;

create unique index if not exists commerce_payment_attempts_one_pending_per_order_uidx
  on public.commerce_payment_attempts(order_id)
  where status='PENDING';
