-- v25.10: Approved production pricing and annual-only commercial model.
-- Historical migrations remain untouched; this migration supersedes runtime values.

update public.product_variants
set price_kurus=79900,
    billing_period='YEARLY',
    name='Yenomi ID — NFC + QR Dijital Kartvizit',
    metadata=(metadata - 'fulfillment_kind') || '{"fulfillment_kind":"INITIAL_BUNDLE","digital_service_included":true,"physical_card_count":1,"service_days":365,"shipping_included":true,"country":"TR","preparation_business_days":2}'::jsonb,
    is_active=true
where sku='YENOMI-NFC-CARD-ANNUAL';

update public.product_variants
set price_kurus=39900,
    billing_period='ONE_TIME',
    metadata=(metadata - 'service_days' - 'grace_days') || '{"fulfillment_kind":"EXTRA_CARD","digital_service_included":false,"physical_card_count":1,"requires_active_entitlement":true,"term_basis":"ACTIVE_ENTITLEMENT","shipping_included":true,"country":"TR"}'::jsonb,
    is_active=true
where sku='YENOMI-NFC-EXTRA';

insert into public.product_variants(product_id,sku,name,price_kurus,billing_period,metadata,is_active)
select id,'YENOMI-DIGITAL-RENEWAL-ANNUAL','Yenomi ID Dijital Hizmet — 1 Yıl Yenileme',29900,'YEARLY',
  '{"fulfillment_kind":"DIGITAL_RENEWAL","digital_service_included":true,"physical_card_count":0,"service_days":365,"requires_active_or_expired_entitlement":true,"shipping_included":false}'::jsonb,true
from public.products where slug='nfc-kart'
on conflict(sku) do update set name=excluded.name,price_kurus=excluded.price_kurus,billing_period=excluded.billing_period,metadata=excluded.metadata,is_active=true;

insert into public.product_variants(product_id,sku,name,price_kurus,billing_period,metadata,is_active)
select id,'YENOMI-NFC-REPLACEMENT','Yenomi ID Kayıp / Replacement NFC Kart',34900,'ONE_TIME',
  '{"fulfillment_kind":"REPLACEMENT_CARD","digital_service_included":false,"physical_card_count":1,"requires_lost_card":true,"requires_active_entitlement":true,"term_basis":"ACTIVE_ENTITLEMENT","shipping_included":true,"country":"TR"}'::jsonb,true
from public.products where slug='nfc-kart'
on conflict(sku) do update set name=excluded.name,price_kurus=excluded.price_kurus,billing_period=excluded.billing_period,metadata=excluded.metadata,is_active=true;

insert into public.business_plans(code,name,seat_limit,annual_price_kurus,monthly_price_kurus,features,is_active) values
  ('STARTER','Starter',10,799000,null,'["Kurumsal yönetim paneli","10 çalışan dijital kartviziti","NFC + QR kartlar","Rol ve yetki yönetimi","Yıllık dijital hizmet"]'::jsonb,true),
  ('GROWTH','Growth',25,1799000,null,'["Kurumsal yönetim paneli","25 çalışan dijital kartviziti","Departman yönetimi","Kurumsal şablonlar","Kullanım istatistikleri","Yıllık dijital hizmet"]'::jsonb,true),
  ('BUSINESS','Business',50,3199000,null,'["Kurumsal yönetim paneli","50 çalışan dijital kartviziti","Gelişmiş rol ve alan izinleri","Kurumsal bağlantılar","Kullanım istatistikleri","Yıllık dijital hizmet"]'::jsonb,true),
  ('ENTERPRISE','Enterprise',null,null,null,'["Özel çalışan kapasitesi","Kurumsal kurulum ve teklif"]'::jsonb,true)
on conflict(code) do update set name=excluded.name,seat_limit=excluded.seat_limit,annual_price_kurus=excluded.annual_price_kurus,monthly_price_kurus=null,features=excluded.features,is_active=true;

-- Renewal creates/extends digital service only. No physical production unit.
create or replace function public.route_commerce_fulfillment()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_item public.commerce_order_items%rowtype; v_sku text; v_kind text; v_org_id uuid; v_card_count integer; v_index integer; v_user_id uuid; v_existing_id uuid;
begin
  -- Keep the composite row target separate from scalar INTO targets.
  select i.* into v_item
  from public.commerce_order_items i
  where i.id=new.order_item_id;
  if not found then return new; end if;

  select pv.sku,
         coalesce(pv.metadata->>'fulfillment_kind',
           case when pv.sku='YENOMI-NFC-EXTRA' then 'EXTRA_CARD'
                when pv.sku like 'YENOMI-BUSINESS-SEATS-%' then 'BUSINESS_CAPACITY_ADDON'
                else 'INITIAL_BUNDLE' end)
  into v_sku,v_kind
  from public.product_variants pv
  where pv.id=v_item.variant_id;
  if not found then return new; end if;
  if v_kind='DIGITAL_RENEWAL' then
    select o.user_id into v_user_id from public.commerce_orders o where o.id=v_item.order_id;
    select e.id into v_existing_id from public.entitlements e
      where e.user_id=v_user_id and e.status in ('ACTIVE','EXPIRED') and e.kind in ('NFC_PHYSICAL_CARD','BUSINESS_CARD')
      order by e.expires_at desc nulls last limit 1 for update;
    if v_existing_id is null then raise exception 'RENEWAL_ENTITLEMENT_REQUIRED'; end if;
    update public.entitlements set status='ACTIVE',expires_at=greatest(coalesce(expires_at,now()),now())+interval '365 days',updated_at=now() where id=v_existing_id;
    return null;
  end if;
  v_org_id:=nullif(v_item.configuration->>'organizationId','')::uuid;
  if v_kind='BUSINESS_CAPACITY_ADDON' then
    v_card_count:=greatest(coalesce(nullif(v_item.configuration->>'seatCount','')::integer,0),1);
    for v_index in 1..v_card_count loop
      insert into public.commerce_physical_card_units(order_item_id,instance_no,purpose,organization_id)
      values(v_item.id,((new.instance_no-1)*v_card_count)+v_index,'BUSINESS_CAPACITY_ADDON',v_org_id) on conflict(order_item_id,instance_no) do nothing;
    end loop;
    return null;
  end if;
  insert into public.commerce_physical_card_units(order_item_id,instance_no,purpose,organization_id)
  values(v_item.id,new.instance_no,case when v_kind='EXTRA_CARD' then 'EXTRA_CARD' when v_kind='REPLACEMENT_CARD' then 'REPLACEMENT_CARD' when v_kind='BUSINESS_INITIAL' then 'BUSINESS_INITIAL' else 'INITIAL_BUNDLE' end,v_org_id)
  on conflict(order_item_id,instance_no) do nothing;
  if v_kind in ('EXTRA_CARD','REPLACEMENT_CARD') then return null; end if;
  return new;
end; $$;

revoke all on function public.route_commerce_fulfillment() from public,anon,authenticated;
grant execute on function public.route_commerce_fulfillment() to service_role;

-- Phase 15 checkout/commercial audit: seat packs are capacity add-ons to the
-- existing annual term, not independent annual subscriptions. Keep historical
-- seed migrations intact but make production semantics explicit here.
update public.product_variants pv
set billing_period='ONE_TIME',
    metadata=(pv.metadata - 'service_days' - 'grace_days') || jsonb_build_object(
      'fulfillment_kind','BUSINESS_CAPACITY_ADDON',
      'seat_count',(pv.metadata->>'seat_count')::integer,
      'physical_card_count',(pv.metadata->>'seat_count')::integer,
      'requires_active_business_subscription',true,
      'term_basis','ACTIVE_BUSINESS_SUBSCRIPTION',
      'shipping_included',true,
      'country','TR'
    ),
    is_active=true
where pv.sku like 'YENOMI-BUSINESS-SEATS-%';

-- Demo plans are fixtures, never sellable production catalogue entries.
update public.business_plans
set is_active=false
where code in ('DEMO-2','DEMO-5','DEMO-10');
