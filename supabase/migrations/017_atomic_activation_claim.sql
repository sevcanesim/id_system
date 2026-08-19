-- Aktivasyon tokeni, sipariş sahipliği ve kullanım hakkını tek transaction içinde bağlar.
create or replace function public.claim_commerce_order_activation(
  p_token_hash text,
  p_user_id uuid,
  p_user_email text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token public.activation_tokens%rowtype;
  v_order public.commerce_orders%rowtype;
  v_now timestamptz := now();
  v_expires timestamptz := now() + interval '365 days';
begin
  select * into v_token
  from public.activation_tokens
  where token_hash = p_token_hash
  for update;

  if not found or v_token.used_at is not null or v_token.invalidated_at is not null or v_token.expires_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'TOKEN_INVALID');
  end if;

  select * into v_order
  from public.commerce_orders
  where id = v_token.order_id
  for update;

  if not found or v_order.status <> 'PAID' then
    return jsonb_build_object('ok', false, 'code', 'ORDER_NOT_PAID');
  end if;

  if v_order.activation_deadline_at is not null and v_order.activation_deadline_at <= v_now then
    return jsonb_build_object('ok', false, 'code', 'ACTIVATION_EXPIRED');
  end if;

  if v_order.user_id is not null then
    return jsonb_build_object('ok', false, 'code', 'ORDER_ALREADY_CLAIMED');
  end if;

  if lower(coalesce(v_order.guest_email, '')) <> lower(coalesce(p_user_email, '')) then
    return jsonb_build_object('ok', false, 'code', 'EMAIL_MISMATCH');
  end if;

  update public.commerce_orders
  set user_id = p_user_id,
      activation_claimed_at = v_now,
      updated_at = v_now
  where id = v_order.id;

  update public.entitlements e
  set user_id = p_user_id,
      status = 'ACTIVE',
      starts_at = coalesce(e.starts_at, v_now),
      expires_at = coalesce(e.expires_at, v_expires)
  where e.order_item_id in (
    select i.id from public.commerce_order_items i where i.order_id = v_order.id
  );

  update public.activation_tokens
  set used_at = v_now
  where id = v_token.id;

  return jsonb_build_object('ok', true, 'order_id', v_order.id);
end;
$$;

revoke all on function public.claim_commerce_order_activation(text, uuid, text) from public;
grant execute on function public.claim_commerce_order_activation(text, uuid, text) to service_role;
