-- v22.17: commerce payment callback is processed atomically and exactly once.

create or replace function public.process_commerce_payment_callback(
  p_attempt_id uuid,
  p_paid boolean,
  p_provider_payment_id text,
  p_error_code text,
  p_error_message text,
  p_raw_result jsonb,
  p_activation_token_hash text,
  p_activation_expires_at timestamptz
)
returns table(
  outcome text,
  order_id uuid,
  order_number text,
  guest_email text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.commerce_payment_attempts%rowtype;
  v_order public.commerce_orders%rowtype;
  v_paid_at timestamptz := now();
begin
  select * into v_attempt
  from public.commerce_payment_attempts
  where id = p_attempt_id
  for update;

  if not found then
    return query select 'ATTEMPT_NOT_FOUND'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_order
  from public.commerce_orders
  where id = v_attempt.order_id
  for update;

  if v_attempt.status = 'PAID' or v_order.status = 'PAID' then
    return query select 'ALREADY_PAID'::text, v_order.id, v_order.order_number, v_order.guest_email;
    return;
  end if;

  if not p_paid then
    update public.commerce_payment_attempts
    set status = 'FAILED',
        provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
        error_code = coalesce(p_error_code, 'PAYMENT_VERIFICATION_FAILED'),
        error_message = coalesce(p_error_message, 'Ödeme doğrulanamadı.'),
        raw_result = p_raw_result,
        updated_at = now()
    where id = v_attempt.id;

    update public.commerce_orders
    set status = 'AWAITING_PAYMENT'
    where id = v_order.id and status <> 'PAID';

    insert into public.commerce_order_status_history(order_id, from_status, to_status, source, note)
    values (v_order.id, v_order.status, 'AWAITING_PAYMENT', 'PAYMENT', 'Ödeme doğrulanamadı');

    return query select 'FAILED'::text, v_order.id, v_order.order_number, v_order.guest_email;
    return;
  end if;

  update public.commerce_payment_attempts
  set status = 'PAID',
      provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id),
      error_code = null,
      error_message = null,
      raw_result = p_raw_result,
      updated_at = now()
  where id = v_attempt.id;

  update public.commerce_orders
  set status = 'PAID',
      paid_at = v_paid_at,
      activation_deadline_at = v_paid_at + interval '30 days'
  where id = v_order.id;

  insert into public.commerce_order_status_history(order_id, from_status, to_status, source, note)
  values (v_order.id, v_order.status, 'PAID', 'PAYMENT', 'iyzico ödeme doğrulandı');

  insert into public.entitlements(order_item_id, instance_no, kind, status)
  select item.id, generated.instance_no, item.product_kind, 'PENDING_ACTIVATION'
  from public.commerce_order_items item
  cross join lateral generate_series(1, greatest(item.quantity, 1)) generated(instance_no)
  where item.order_id = v_order.id
  on conflict (order_item_id, instance_no) do nothing;

  insert into public.activation_tokens(order_id, token_hash, expires_at)
  values (v_order.id, p_activation_token_hash, p_activation_expires_at);

  return query select 'PAID_PROCESSED'::text, v_order.id, v_order.order_number, v_order.guest_email;
end;
$$;

revoke all on function public.process_commerce_payment_callback(uuid,boolean,text,text,text,jsonb,text,timestamptz) from public;
grant execute on function public.process_commerce_payment_callback(uuid,boolean,text,text,text,jsonb,text,timestamptz) to service_role;
