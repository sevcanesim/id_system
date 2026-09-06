create or replace function public.create_checkout_order(p_input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.commerce_orders%rowtype;
  v_item_count integer := 0;
  v_expected_item_count integer := 0;
begin
  if p_input is null
    or jsonb_typeof(p_input) <> 'object'
    or jsonb_typeof(p_input->'items') <> 'array'
    or jsonb_array_length(p_input->'items') = 0
    or jsonb_typeof(p_input->'shipping') <> 'object'
    or jsonb_typeof(p_input->'billing') <> 'object'
    or jsonb_typeof(p_input->'consents') <> 'object' then
    raise exception 'INVALID_CHECKOUT_ORDER_INPUT';
  end if;

  insert into public.commerce_orders (
    guest_email,
    status,
    currency,
    subtotal_kurus,
    shipping_kurus,
    total_kurus,
    customer_name,
    customer_phone,
    country_code,
    user_id,
    company_name,
    tax_number,
    tax_office
  ) values (
    lower(btrim(p_input->>'email')),
    'AWAITING_PAYMENT',
    'TRY',
    (p_input->>'subtotalKurus')::integer,
    (p_input->>'shippingKurus')::integer,
    (p_input->>'totalKurus')::integer,
    btrim(p_input->>'customerName'),
    btrim(p_input->>'customerPhone'),
    'TR',
    nullif(p_input->>'userId', '')::uuid,
    nullif(btrim(p_input->>'companyName'), ''),
    nullif(btrim(p_input->>'taxNumber'), ''),
    nullif(btrim(p_input->>'taxOffice'), '')
  ) returning * into v_order;

  insert into public.commerce_order_items (
    order_id,
    product_id,
    variant_id,
    product_kind,
    product_name,
    unit_price_kurus,
    quantity,
    configuration
  )
  select
    v_order.id,
    (item.value->>'productId')::uuid,
    nullif(item.value->>'variantId', '')::uuid,
    (item.value->>'productKind')::public.product_kind,
    item.value->>'productName',
    (item.value->>'unitPriceKurus')::integer,
    (item.value->>'quantity')::integer,
    coalesce(item.value->'configuration', '{}'::jsonb)
  from jsonb_array_elements(p_input->'items') as item(value);

  get diagnostics v_item_count = row_count;
  v_expected_item_count := jsonb_array_length(p_input->'items');
  if v_item_count <> v_expected_item_count then
    raise exception 'CHECKOUT_ORDER_ITEM_COUNT_MISMATCH';
  end if;

  insert into public.shipping_addresses (
    order_id,
    recipient_name,
    phone,
    address_line,
    district,
    city,
    postal_code,
    latitude,
    longitude,
    map_url,
    delivery_note,
    country_code
  ) values (
    v_order.id,
    btrim(p_input->'shipping'->>'recipientName'),
    btrim(p_input->'shipping'->>'phone'),
    btrim(p_input->'shipping'->>'addressLine'),
    btrim(p_input->'shipping'->>'district'),
    btrim(p_input->'shipping'->>'city'),
    nullif(btrim(p_input->'shipping'->>'postalCode'), ''),
    nullif(p_input->'shipping'->>'latitude', '')::double precision,
    nullif(p_input->'shipping'->>'longitude', '')::double precision,
    nullif(btrim(p_input->'shipping'->>'mapUrl'), ''),
    nullif(btrim(p_input->'shipping'->>'deliveryNote'), ''),
    'TR'
  );

  insert into public.commerce_order_billing_profiles (
    order_id,
    billing_type,
    organization_id,
    legal_name,
    tax_number,
    tax_office,
    contact_name,
    email,
    phone,
    address_line,
    district,
    city,
    postal_code,
    country_code
  ) values (
    v_order.id,
    p_input->'billing'->>'billingType',
    nullif(p_input->'billing'->>'organizationId', '')::uuid,
    btrim(p_input->'billing'->>'legalName'),
    nullif(btrim(p_input->'billing'->>'taxNumber'), ''),
    nullif(btrim(p_input->'billing'->>'taxOffice'), ''),
    btrim(p_input->'billing'->>'contactName'),
    lower(btrim(p_input->'billing'->>'email')),
    btrim(p_input->'billing'->>'phone'),
    btrim(p_input->'billing'->>'addressLine'),
    btrim(p_input->'billing'->>'district'),
    btrim(p_input->'billing'->>'city'),
    nullif(btrim(p_input->'billing'->>'postalCode'), ''),
    'TR'
  );

  insert into public.commerce_order_consents (
    order_id,
    distance_sales_accepted,
    personalization_accepted,
    distance_sales_version,
    personalization_version,
    privacy_version,
    accepted_ip,
    request_id
  ) values (
    v_order.id,
    true,
    true,
    btrim(p_input->'consents'->>'distanceSalesVersion'),
    btrim(p_input->'consents'->>'personalizationVersion'),
    btrim(p_input->'consents'->>'privacyVersion'),
    nullif(btrim(p_input->'consents'->>'acceptedIp'), ''),
    nullif(btrim(p_input->'consents'->>'requestId'), '')
  );

  return jsonb_build_object('orderId', v_order.id, 'orderNumber', v_order.order_number);
end;
$$;

revoke all on function public.create_checkout_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_checkout_order(jsonb) to service_role;

drop policy if exists "Company owner and HR can read corporate billing snapshots" on public.commerce_order_billing_profiles;
drop policy if exists "Company owner can read corporate billing snapshots" on public.commerce_order_billing_profiles;
create policy "Company owner can read corporate billing snapshots"
  on public.commerce_order_billing_profiles for select to authenticated using (
    organization_id is not null
    and exists (
      select 1
      from public.organization_members member
      where member.organization_id = commerce_order_billing_profiles.organization_id
        and member.user_id = auth.uid()
        and member.status = 'ACTIVE'
        and member.role = 'OWNER'
    )
  );
