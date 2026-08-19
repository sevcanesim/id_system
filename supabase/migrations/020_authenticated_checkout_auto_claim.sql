-- v23.3: Satın alma öncesinde hesap zorunlu olduğu için ödeme sonrası kullanım
-- hakkını kullanıcıya otomatik ve atomik olarak bağla. Aktivasyon tokeni yalnız
-- eski misafir siparişlerinin geriye dönük desteği için korunur.
create or replace function public.finalize_authenticated_commerce_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.commerce_orders%rowtype;
  v_now timestamptz := now();
begin
  select * into v_order
  from public.commerce_orders
  where id = p_order_id
  for update;

  if not found or v_order.status <> 'PAID' then
    return jsonb_build_object('ok', false, 'code', 'ORDER_NOT_PAID');
  end if;
  if v_order.user_id is null then
    return jsonb_build_object('ok', false, 'code', 'ACCOUNT_REQUIRED');
  end if;

  update public.commerce_orders
  set activation_claimed_at = coalesce(activation_claimed_at, v_now),
      updated_at = v_now
  where id = v_order.id;

  update public.entitlements e
  set user_id = v_order.user_id,
      status = 'ACTIVE',
      starts_at = coalesce(e.starts_at, v_now),
      expires_at = coalesce(e.expires_at, v_now + interval '365 days')
  where e.order_item_id in (
    select i.id from public.commerce_order_items i where i.order_id = v_order.id
  );

  update public.activation_tokens
  set invalidated_at = coalesce(invalidated_at, v_now)
  where order_id = v_order.id and used_at is null;

  return jsonb_build_object('ok', true, 'order_id', v_order.id, 'user_id', v_order.user_id);
end;
$$;

revoke all on function public.finalize_authenticated_commerce_order(uuid) from public, anon, authenticated;
grant execute on function public.finalize_authenticated_commerce_order(uuid) to service_role;
