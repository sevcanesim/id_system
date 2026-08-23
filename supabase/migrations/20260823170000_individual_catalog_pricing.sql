-- Individual catalog: Digital ₺799 (no NFC), NFC ₺1.490 (hero), Premium ₺2.490 + 500 Network Mail.
-- Digital first purchase must not create a physical card unit.

insert into public.identity_package_catalog(code, name, occupancy, product_family, live)
values ('INDIVIDUAL_DIGITAL', 'Dijital', 'INDIVIDUAL', 'DIGITAL_ID', true)
on conflict (code) do update set
  name = excluded.name,
  occupancy = excluded.occupancy,
  product_family = excluded.product_family,
  live = true;

update public.identity_package_catalog
set name = 'NFC'
where code = 'INDIVIDUAL';

update public.identity_package_catalog
set name = 'Premium'
where code = 'INDIVIDUAL_PREMIUM';

update public.product_variants
set price_kurus = 149000,
    name = 'Yenomi ID — NFC Kart',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'fulfillment_kind', 'INITIAL_BUNDLE',
      'digital_service_included', true,
      'physical_card_count', 1,
      'service_days', 365,
      'shipping_included', true,
      'package_code', 'INDIVIDUAL'
    ),
    is_active = true
where sku = 'YENOMI-NFC-CARD-ANNUAL';

insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata, is_active)
select product_id,
       'YENOMI-DIGITAL-ANNUAL',
       'Yenomi ID Dijital Kartvizit',
       79900,
       'YEARLY',
       jsonb_build_object(
         'fulfillment_kind', 'DIGITAL_INITIAL',
         'digital_service_included', true,
         'physical_card_count', 0,
         'service_days', 365,
         'shipping_included', false,
         'package_code', 'INDIVIDUAL_DIGITAL'
       ),
       true
from public.product_variants
where sku = 'YENOMI-NFC-CARD-ANNUAL'
on conflict (sku) do update set
  name = excluded.name,
  price_kurus = excluded.price_kurus,
  billing_period = excluded.billing_period,
  metadata = excluded.metadata,
  is_active = true,
  product_id = excluded.product_id;

update public.product_variants
set price_kurus = 249000,
    name = 'Yenomi ID Premium — NFC + 500 Network Mail',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'fulfillment_kind', 'INITIAL_BUNDLE',
      'digital_service_included', true,
      'physical_card_count', 1,
      'service_days', 365,
      'shipping_included', true,
      'package_code', 'INDIVIDUAL_PREMIUM',
      'network_mail_credits', 500
    ),
    is_active = true
where sku = 'YENOMI-NFC-PREMIUM-ANNUAL';

update public.product_variants
set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('network_mail_credits', 500)
where sku in ('YENOMI-PREMIUM-RENEWAL-ANNUAL', 'YENOMI-PREMIUM-UPGRADE');

update public.product_variants
set price_kurus = 100000,
    name = 'Yenomi ID Premium yükseltme'
where sku = 'YENOMI-PREMIUM-UPGRADE';

create or replace function public.route_commerce_fulfillment()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_item public.commerce_order_items%rowtype;
  v_sku text;
  v_kind text;
  v_metadata jsonb;
  v_org_id uuid;
  v_card_count integer;
  v_index integer;
  v_user_id uuid;
  v_existing public.entitlements%rowtype;
  v_new_expiry timestamptz;
  v_grant integer;
  v_package text;
begin
  select i.* into v_item from public.commerce_order_items i where i.id=new.order_item_id;
  if not found then return new; end if;

  select pv.sku,
         coalesce(pv.metadata->>'fulfillment_kind',
           case when pv.sku='YENOMI-NFC-EXTRA' then 'EXTRA_CARD'
                when pv.sku like 'YENOMI-BUSINESS-SEATS-%' then 'BUSINESS_CAPACITY_ADDON'
                when pv.sku like 'YENOMI-CORP-%' then 'CORPORATE_PACKAGE'
                else 'INITIAL_BUNDLE' end),
         coalesce(pv.metadata, '{}'::jsonb)
  into v_sku, v_kind, v_metadata
  from public.product_variants pv where pv.id=v_item.variant_id;
  if not found then return new; end if;

  v_grant := greatest(coalesce(nullif(v_metadata->>'network_mail_credits','')::integer, 0), 0);
  v_package := nullif(v_metadata->>'package_code','');

  if v_kind in ('DIGITAL_RENEWAL', 'PREMIUM_UPGRADE') then
    select o.user_id into v_user_id from public.commerce_orders o where o.id=v_item.order_id;
    select e.* into v_existing
      from public.entitlements e
      where e.user_id=v_user_id
        and e.status in ('ACTIVE','EXPIRED')
        and e.kind in ('NFC_PHYSICAL_CARD','BUSINESS_CARD')
      order by e.expires_at desc nulls last
      limit 1 for update;

    if not found then
      perform public.record_commerce_fulfillment_issue(
        v_item.order_id, v_item.id, 'RENEWAL_ENTITLEMENT_MISSING',
        jsonb_build_object('user_id', v_user_id, 'sku', v_sku, 'fulfillment_kind', v_kind)
      );
      return null;
    end if;

    if v_kind = 'DIGITAL_RENEWAL' then
      v_new_expiry := greatest(coalesce(v_existing.expires_at, now()), now()) + interval '365 days';
      update public.entitlements
      set status='ACTIVE',
          expires_at=v_new_expiry,
          grace_ends_at=v_new_expiry + interval '7 days',
          updated_at=now()
      where id=v_existing.id;

      if v_sku = 'YENOMI-PREMIUM-RENEWAL-ANNUAL' then
        update public.entitlements
        set package_code = 'INDIVIDUAL_PREMIUM'
        where id = v_existing.id;
        perform public.apply_individual_network_mail(v_existing.id, 'ROLLOVER', v_grant);
      else
        update public.entitlements
        set package_code = case
          when v_existing.package_code = 'INDIVIDUAL_DIGITAL' then 'INDIVIDUAL_DIGITAL'
          else 'INDIVIDUAL'
        end
        where id = v_existing.id;
        perform public.apply_individual_network_mail(v_existing.id, 'EXPIRE', 0);
      end if;
      return null;
    end if;

    update public.entitlements
    set package_code = coalesce(v_package, 'INDIVIDUAL_PREMIUM'),
        status = 'ACTIVE',
        updated_at = now()
    where id = v_existing.id;
    perform public.apply_individual_network_mail(v_existing.id, 'GRANT', v_grant);
    return null;
  end if;

  v_org_id:=nullif(v_item.configuration->>'organizationId','')::uuid;

  if v_kind='CORPORATE_PACKAGE' then
    v_card_count:=greatest(coalesce(nullif(v_metadata->>'seat_count','')::integer, 0), 0);
    if v_card_count <= 0 then
      perform public.record_commerce_fulfillment_issue(
        v_item.order_id, v_item.id, 'INVALID_FULFILLMENT_METADATA',
        jsonb_build_object('sku', v_sku, 'fulfillment_kind', v_kind)
      );
      return null;
    end if;
    for v_index in 1..v_card_count loop
      insert into public.commerce_physical_card_units(order_item_id, instance_no, purpose, organization_id)
      values (v_item.id, ((new.instance_no-1)*v_card_count)+v_index, 'BUSINESS_INITIAL', v_org_id)
      on conflict(order_item_id, instance_no) do nothing;
    end loop;
    return null;
  end if;

  if v_kind='BUSINESS_CAPACITY_ADDON' then
    v_card_count:=coalesce(nullif(v_item.configuration->>'seatCount','')::integer,0);
    if v_org_id is null or v_card_count <= 0 then
      perform public.record_commerce_fulfillment_issue(
        v_item.order_id,v_item.id,'INVALID_FULFILLMENT_METADATA',
        jsonb_build_object('organization_id',v_org_id,'seat_count',v_card_count,'sku',v_sku)
      );
      return null;
    end if;
    for v_index in 1..v_card_count loop
      insert into public.commerce_physical_card_units(order_item_id,instance_no,purpose,organization_id)
      values(v_item.id,((new.instance_no-1)*v_card_count)+v_index,'BUSINESS_CAPACITY_ADDON',v_org_id)
      on conflict(order_item_id,instance_no) do nothing;
    end loop;
    return null;
  end if;

  v_card_count := greatest(coalesce(nullif(v_metadata->>'physical_card_count','')::integer, 1), 0);
  if v_kind = 'DIGITAL_INITIAL' or (v_kind = 'INITIAL_BUNDLE' and v_card_count = 0) then
    new.package_code := coalesce(v_package, 'INDIVIDUAL_DIGITAL');
    new.network_mail_limit := coalesce(new.network_mail_limit, 0);
    new.network_mail_remaining := coalesce(new.network_mail_remaining, 0);
    return new;
  end if;

  insert into public.commerce_physical_card_units(order_item_id,instance_no,purpose,organization_id)
  values(
    v_item.id,new.instance_no,
    case when v_kind='EXTRA_CARD' then 'EXTRA_CARD'
         when v_kind='REPLACEMENT_CARD' then 'REPLACEMENT_CARD'
         when v_kind='BUSINESS_INITIAL' then 'BUSINESS_INITIAL'
         else 'INITIAL_BUNDLE' end,
    v_org_id
  ) on conflict(order_item_id,instance_no) do nothing;

  if v_kind in ('EXTRA_CARD','REPLACEMENT_CARD') then return null; end if;

  if v_kind = 'INITIAL_BUNDLE' then
    new.package_code := coalesce(v_package, 'INDIVIDUAL');
    if v_grant > 0 then
      new.network_mail_limit := v_grant;
      new.network_mail_remaining := v_grant;
    else
      new.network_mail_limit := coalesce(new.network_mail_limit, 0);
      new.network_mail_remaining := coalesce(new.network_mail_remaining, 0);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.route_commerce_fulfillment() from public,anon,authenticated;
grant execute on function public.route_commerce_fulfillment() to service_role;
