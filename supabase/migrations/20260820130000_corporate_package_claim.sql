-- Guest claim must attach the paid CORP package owner. finalize_authenticated
-- already did this for signed-in checkout; claim_commerce_order_activation did not.

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
  v_grace_ends timestamptz := now() + interval '372 days';
  v_corporate boolean := false;
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
      expires_at = coalesce(e.expires_at, v_expires),
      grace_ends_at = coalesce(e.grace_ends_at, v_grace_ends)
  where e.order_item_id in (
    select i.id from public.commerce_order_items i where i.order_id = v_order.id
  );

  update public.activation_tokens
  set used_at = v_now
  where id = v_token.id;

  perform public.fulfill_paid_corporate_package_order(v_order.id);

  update public.organization_members m
  set user_id = coalesce(m.user_id, p_user_id),
      status = 'ACTIVE'
  where m.role = 'OWNER'
    and lower(m.email) = lower(v_order.guest_email)
    and m.organization_id in (
      select distinct coalesce(
        nullif(i.configuration->>'organizationId', '')::uuid,
        u.organization_id
      )
      from public.commerce_order_items i
      left join public.commerce_physical_card_units u on u.order_item_id = i.id
      where i.order_id = v_order.id
    )
    and m.organization_id is not null;

  select exists (
    select 1
    from public.commerce_order_items i
    join public.product_variants pv on pv.id = i.variant_id
    where i.order_id = v_order.id
      and coalesce(pv.metadata->>'fulfillment_kind', '') = 'CORPORATE_PACKAGE'
  ) into v_corporate;

  return jsonb_build_object('ok', true, 'order_id', v_order.id, 'corporate', v_corporate);
end;
$$;

revoke all on function public.claim_commerce_order_activation(text, uuid, text) from public;
grant execute on function public.claim_commerce_order_activation(text, uuid, text) to service_role;
