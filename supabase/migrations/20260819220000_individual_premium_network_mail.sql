-- Individual Premium checkout is live only because this migration grants
-- Network Mail on the personal entitlement ledger. Year-1 1.250 TL ships NFC
-- and writes 100 credits. 451 TL upgrade and 599 TL renewal do not ship a
-- second card. Custom sending domains stay not-live; sender policy is app-side.

alter table public.entitlements
  add column if not exists updated_at timestamptz not null default now();

alter table public.entitlements
  add column if not exists package_code text;

alter table public.entitlements
  add column if not exists network_mail_limit integer not null default 0;

alter table public.entitlements
  add column if not exists network_mail_remaining integer not null default 0;

do $$
begin
  alter table public.entitlements
    add constraint entitlements_network_mail_nonneg
    check (network_mail_limit >= 0 and network_mail_remaining >= 0);
exception
  when duplicate_object then null;
end $$;

update public.entitlements
set package_code = coalesce(package_code, 'INDIVIDUAL')
where kind in ('NFC_PHYSICAL_CARD', 'BUSINESS_CARD')
  and package_code is null;

insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata, is_active)
select product_id,
  'YENOMI-NFC-PREMIUM-ANNUAL',
  'Yenomi ID Bireysel Premium — NFC + 100 Network Mail',
  125000,
  'YEARLY',
  '{"fulfillment_kind":"INITIAL_BUNDLE","digital_service_included":true,"physical_card_count":1,"service_days":365,"shipping_included":true,"country":"TR","preparation_business_days":2,"package_code":"INDIVIDUAL_PREMIUM","network_mail_credits":100}'::jsonb,
  true
from public.product_variants
where sku = 'YENOMI-NFC-CARD-ANNUAL'
on conflict (sku) do update set
  name = excluded.name,
  price_kurus = excluded.price_kurus,
  billing_period = excluded.billing_period,
  metadata = excluded.metadata,
  is_active = true;

insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata, is_active)
select product_id,
  'YENOMI-PREMIUM-RENEWAL-ANNUAL',
  'Yenomi ID Bireysel Premium — 1 Yıl Yenileme',
  59900,
  'YEARLY',
  '{"fulfillment_kind":"DIGITAL_RENEWAL","digital_service_included":true,"physical_card_count":0,"service_days":365,"requires_active_or_expired_entitlement":true,"shipping_included":false,"package_code":"INDIVIDUAL_PREMIUM","network_mail_credits":100}'::jsonb,
  true
from public.product_variants
where sku = 'YENOMI-NFC-CARD-ANNUAL'
on conflict (sku) do update set
  name = excluded.name,
  price_kurus = excluded.price_kurus,
  billing_period = excluded.billing_period,
  metadata = excluded.metadata,
  is_active = true;

insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata, is_active)
select product_id,
  'YENOMI-PREMIUM-UPGRADE',
  'Yenomi ID Bireysel Premium yükseltme',
  45100,
  'ONE_TIME',
  '{"fulfillment_kind":"PREMIUM_UPGRADE","digital_service_included":false,"physical_card_count":0,"requires_active_entitlement":true,"shipping_included":false,"package_code":"INDIVIDUAL_PREMIUM","network_mail_credits":100}'::jsonb,
  true
from public.product_variants
where sku = 'YENOMI-NFC-CARD-ANNUAL'
on conflict (sku) do update set
  name = excluded.name,
  price_kurus = excluded.price_kurus,
  billing_period = excluded.billing_period,
  metadata = excluded.metadata,
  is_active = true;

create or replace function public.apply_individual_network_mail(
  p_entitlement_id uuid,
  p_mode text,
  p_grant integer
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining integer;
  v_limit integer;
  v_grant integer := greatest(coalesce(p_grant, 0), 0);
begin
  if p_mode not in ('GRANT', 'ROLLOVER', 'EXPIRE') then
    raise exception 'invalid network mail mode';
  end if;

  select network_mail_remaining, network_mail_limit
  into v_remaining, v_limit
  from public.entitlements
  where id = p_entitlement_id
  for update;

  if not found then
    return;
  end if;

  v_remaining := greatest(coalesce(v_remaining, 0), 0);
  v_limit := greatest(coalesce(v_limit, 0), 0);

  if p_mode = 'EXPIRE' then
    update public.entitlements
    set network_mail_remaining = 0,
        network_mail_limit = 0,
        updated_at = now()
    where id = p_entitlement_id;
    return;
  end if;

  if p_mode = 'ROLLOVER' then
    update public.entitlements
    set network_mail_remaining = v_remaining + v_grant,
        network_mail_limit = v_grant,
        updated_at = now()
    where id = p_entitlement_id;
    return;
  end if;

  update public.entitlements
  set network_mail_remaining = v_remaining + v_grant,
      network_mail_limit = greatest(v_limit, v_remaining + v_grant),
      updated_at = now()
  where id = p_entitlement_id;
end;
$$;

revoke all on function public.apply_individual_network_mail(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.apply_individual_network_mail(uuid, text, integer) to service_role;

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
        set package_code = 'INDIVIDUAL'
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
end; $$;

revoke all on function public.route_commerce_fulfillment() from public,anon,authenticated;
grant execute on function public.route_commerce_fulfillment() to service_role;
