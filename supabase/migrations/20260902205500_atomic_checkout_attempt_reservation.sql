-- Serialize payment-attempt reservation per commerce order.
-- A second request must never invalidate or race an Iyzico checkout that is still being initialized.

create or replace function public.reserve_commerce_payment_attempt(
  p_order_id uuid,
  p_amount_kurus integer,
  p_currency text,
  p_conversation_id text,
  p_request_fingerprint text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_order public.commerce_orders%rowtype;
  v_attempt public.commerce_payment_attempts%rowtype;
begin
  if p_amount_kurus < 0
    or nullif(trim(p_currency),'') is null
    or nullif(trim(p_conversation_id),'') is null
    or nullif(trim(p_request_fingerprint),'') is null
    or nullif(trim(p_idempotency_key),'') is null
  then
    return jsonb_build_object('ok',false,'code','INVALID_INPUT');
  end if;

  -- The order row is the serialization boundary. Only one request at a time
  -- may inspect/create an open payment attempt for this order.
  select * into v_order
  from public.commerce_orders
  where id=p_order_id
  for update;

  if not found then
    return jsonb_build_object('ok',false,'code','ORDER_NOT_FOUND');
  end if;

  if v_order.status <> 'AWAITING_PAYMENT' then
    return jsonb_build_object('ok',false,'code','ORDER_NOT_PAYABLE','order_status',v_order.status);
  end if;

  -- Same idempotency key always resolves to the original attempt, including
  -- a request that raced between the route's preflight lookup and this RPC.
  select * into v_attempt
  from public.commerce_payment_attempts
  where idempotency_key=p_idempotency_key
  limit 1;

  if found then
    return jsonb_build_object(
      'ok',true,
      'decision','EXISTING',
      'attempt_id',v_attempt.id,
      'order_id',v_attempt.order_id,
      'status',v_attempt.status,
      'request_fingerprint',v_attempt.request_fingerprint,
      'payment_page_url',v_attempt.payment_page_url
    );
  end if;

  -- Never mark an incomplete PENDING attempt FAILED merely because another
  -- HTTP request arrived while Iyzico initialization was still in flight.
  select * into v_attempt
  from public.commerce_payment_attempts
  where order_id=p_order_id
    and status='PENDING'
  order by created_at desc
  limit 1
  for update;

  if found then
    if v_attempt.request_fingerprint is distinct from p_request_fingerprint then
      return jsonb_build_object(
        'ok',false,
        'code','FINGERPRINT_CONFLICT',
        'attempt_id',v_attempt.id
      );
    end if;

    return jsonb_build_object(
      'ok',true,
      'decision',case when v_attempt.payment_page_url is null then 'IN_PROGRESS' else 'REUSE' end,
      'attempt_id',v_attempt.id,
      'order_id',v_attempt.order_id,
      'status',v_attempt.status,
      'request_fingerprint',v_attempt.request_fingerprint,
      'payment_page_url',v_attempt.payment_page_url
    );
  end if;

  insert into public.commerce_payment_attempts(
    order_id,
    status,
    amount_kurus,
    currency,
    conversation_id,
    request_fingerprint,
    idempotency_key
  ) values (
    p_order_id,
    'PENDING',
    p_amount_kurus,
    upper(trim(p_currency)),
    trim(p_conversation_id),
    p_request_fingerprint,
    p_idempotency_key
  )
  returning * into v_attempt;

  return jsonb_build_object(
    'ok',true,
    'decision','RESERVED',
    'attempt_id',v_attempt.id,
    'order_id',v_attempt.order_id,
    'status',v_attempt.status,
    'request_fingerprint',v_attempt.request_fingerprint,
    'payment_page_url',v_attempt.payment_page_url
  );
exception
  when unique_violation then
    -- Defensive fallback for a concurrent idempotency-key collision. The
    -- transaction-level order lock already prevents same-order duplication.
    select * into v_attempt
    from public.commerce_payment_attempts
    where idempotency_key=p_idempotency_key
    limit 1;

    if found then
      return jsonb_build_object(
        'ok',true,
        'decision','EXISTING',
        'attempt_id',v_attempt.id,
        'order_id',v_attempt.order_id,
        'status',v_attempt.status,
        'request_fingerprint',v_attempt.request_fingerprint,
        'payment_page_url',v_attempt.payment_page_url
      );
    end if;
    raise;
end;
$$;

revoke all on function public.reserve_commerce_payment_attempt(uuid,integer,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_commerce_payment_attempt(uuid,integer,text,text,text,text) to service_role;
