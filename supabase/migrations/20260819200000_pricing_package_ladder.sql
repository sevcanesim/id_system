-- Commercial ladder: 100 Network Mail / seat / year, distinct CORP packs,
-- seat add-on prices that do not undercut pack upgrades, Campaign Mail catalog
-- as coming-soon (inactive), Network Mail credit packs as rate-card only.

create or replace function public.network_mail_grant(p_seats integer)
returns integer
language sql
immutable
as $$
  select greatest(coalesce(p_seats, 0), 0) * 100;
$$;

revoke all on function public.network_mail_grant(integer) from public, anon, authenticated;
grant execute on function public.network_mail_grant(integer) to service_role;

insert into public.business_plans(code, name, seat_limit, annual_price_kurus, monthly_price_kurus, features, is_active) values
  ('CORP-2', 'Kurumsal 2', 2, 240000, null, '["2 dijital profil","2 NFC kart","Şirket yönetim paneli","200 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-3', 'Kurumsal 3', 3, 350000, null, '["3 dijital profil","3 NFC kart","Şirket yönetim paneli","300 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-4', 'Kurumsal 4', 4, 450000, null, '["4 dijital profil","4 NFC kart","Şirket yönetim paneli","400 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-5', 'Kurumsal 5', 5, 550000, null, '["5 dijital profil","5 NFC kart","Şirket yönetim paneli","500 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-10', 'Kurumsal 10', 10, 990000, null, '["10 dijital profil","10 NFC kart","1 şirket paneli","1.000 Network Mail / yıl","Toplantı oluşturma","Sunum paylaşımı","Kişi / lead yönetimi","Kurumsal analizler","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-20', 'Kurumsal 20', 20, 1890000, null, '["20 dijital profil","20 NFC kart","Şirket yönetim paneli","2.000 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","Kurumsal analizler","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-25', 'Kurumsal 25', 25, 2290000, null, '["25 dijital profil","25 NFC kart","Şirket yönetim paneli","2.500 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","Kurumsal analizler","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-50', 'Kurumsal 50', 50, 3990000, null, '["50 dijital profil","50 NFC kart","Şirket yönetim paneli","5.000 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","Kurumsal analizler","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-75', 'Kurumsal 75', 75, 5690000, null, '["75 dijital profil","75 NFC kart","Şirket yönetim paneli","7.500 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","Kurumsal analizler","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true),
  ('CORP-100', 'Kurumsal 100', 100, 6990000, null, '["100 dijital profil","100 NFC kart","Şirket yönetim paneli","10.000 Network Mail / yıl","Toplantı ve sunum","Contact / lead yönetimi","Kurumsal analizler","1 yıllık kullanım","Ücretsiz kargo"]'::jsonb, true)
on conflict (code) do update set
  name = excluded.name,
  seat_limit = excluded.seat_limit,
  annual_price_kurus = excluded.annual_price_kurus,
  monthly_price_kurus = null,
  features = excluded.features,
  is_active = true;

-- Keep legacy codes as price-aligned aliases so existing subscriptions stay valid.
-- Hide them from new sales; CORP-* is the public catalog.
update public.business_plans
set name = 'Kurumsal 10 (eski kod)',
    seat_limit = 10,
    annual_price_kurus = 990000,
    monthly_price_kurus = null,
    features = '["10 dijital profil","10 NFC kart","1 şirket paneli","1.000 Network Mail / yıl","Toplantı oluşturma","Sunum paylaşımı","Kişi / lead yönetimi","Kurumsal analizler"]'::jsonb,
    is_active = false
where code = 'STARTER';

update public.business_plans
set name = 'Kurumsal 25 (eski kod)',
    seat_limit = 25,
    annual_price_kurus = 2290000,
    monthly_price_kurus = null,
    features = '["25 dijital profil","25 NFC kart","Şirket yönetim paneli","2.500 Network Mail / yıl"]'::jsonb,
    is_active = false
where code = 'GROWTH';

update public.business_plans
set name = 'Kurumsal 50 (eski kod)',
    seat_limit = 50,
    annual_price_kurus = 3990000,
    monthly_price_kurus = null,
    features = '["50 dijital profil","50 NFC kart","Şirket yönetim paneli","5.000 Network Mail / yıl"]'::jsonb,
    is_active = false
where code = 'BUSINESS';

update public.business_plans
set features = '["Özel çalışan kapasitesi","Kuruma özel kurulum","Merkezi yönetim ve raporlama","Network Mail kişi başı 100 / yıl"]'::jsonb
where code = 'ENTERPRISE';

update public.product_variants set price_kurus = 99000, name = 'Ek 1 Kullanıcı + Kart' where sku = 'YENOMI-BUSINESS-SEATS-1';
update public.product_variants set price_kurus = 189000, name = 'Ek 2 Kullanıcı + Kart' where sku = 'YENOMI-BUSINESS-SEATS-2';
update public.product_variants set price_kurus = 269000, name = 'Ek 3 Kullanıcı + Kart' where sku = 'YENOMI-BUSINESS-SEATS-3';
update public.product_variants set price_kurus = 449000, name = 'Ek 5 Kullanıcı + Kart' where sku = 'YENOMI-BUSINESS-SEATS-5';
update public.product_variants set price_kurus = 849000, name = 'Ek 10 Kullanıcı + Kart' where sku = 'YENOMI-BUSINESS-SEATS-10';

-- Rate-card SKUs only. Inactive until fulfillment grants Network Mail credits.
insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata, is_active)
select id, v.sku, v.name, v.price_kurus, 'ONE_TIME', v.metadata, false
from public.products
cross join (values
  ('YENOMI-NETWORK-MAIL-100', 'Network Mail — 100 kredi', 14900, '{"fulfillment_kind":"NETWORK_MAIL_CREDIT_PACK","mail_ledger":"NETWORK","credit_count":100,"live_checkout":false}'::jsonb),
  ('YENOMI-NETWORK-MAIL-500', 'Network Mail — 500 kredi', 49900, '{"fulfillment_kind":"NETWORK_MAIL_CREDIT_PACK","mail_ledger":"NETWORK","credit_count":500,"live_checkout":false}'::jsonb),
  ('YENOMI-NETWORK-MAIL-1000', 'Network Mail — 1.000 kredi', 79900, '{"fulfillment_kind":"NETWORK_MAIL_CREDIT_PACK","mail_ledger":"NETWORK","credit_count":1000,"live_checkout":false}'::jsonb),
  ('YENOMI-NETWORK-MAIL-5000', 'Network Mail — 5.000 kredi', 299000, '{"fulfillment_kind":"NETWORK_MAIL_CREDIT_PACK","mail_ledger":"NETWORK","credit_count":5000,"live_checkout":false}'::jsonb),
  ('YENOMI-CAMPAIGN-MAIL-1000', 'Campaign Mail — 1.000 kredi', 24900, '{"fulfillment_kind":"CAMPAIGN_MAIL_CREDIT_PACK","mail_ledger":"CAMPAIGN","credit_count":1000,"stage":"COMING_SOON"}'::jsonb),
  ('YENOMI-CAMPAIGN-MAIL-5000', 'Campaign Mail — 5.000 kredi', 89900, '{"fulfillment_kind":"CAMPAIGN_MAIL_CREDIT_PACK","mail_ledger":"CAMPAIGN","credit_count":5000,"stage":"COMING_SOON"}'::jsonb),
  ('YENOMI-CAMPAIGN-MAIL-10000', 'Campaign Mail — 10.000 kredi', 149000, '{"fulfillment_kind":"CAMPAIGN_MAIL_CREDIT_PACK","mail_ledger":"CAMPAIGN","credit_count":10000,"stage":"COMING_SOON"}'::jsonb),
  ('YENOMI-CAMPAIGN-MAIL-25000', 'Campaign Mail — 25.000 kredi', 299000, '{"fulfillment_kind":"CAMPAIGN_MAIL_CREDIT_PACK","mail_ledger":"CAMPAIGN","credit_count":25000,"stage":"COMING_SOON"}'::jsonb),
  ('YENOMI-CAMPAIGN-MAIL-50000', 'Campaign Mail — 50.000 kredi', 499000, '{"fulfillment_kind":"CAMPAIGN_MAIL_CREDIT_PACK","mail_ledger":"CAMPAIGN","credit_count":50000,"stage":"COMING_SOON"}'::jsonb),
  ('YENOMI-CAMPAIGN-MAIL-100000', 'Campaign Mail — 100.000 kredi', 849000, '{"fulfillment_kind":"CAMPAIGN_MAIL_CREDIT_PACK","mail_ledger":"CAMPAIGN","credit_count":100000,"stage":"COMING_SOON"}'::jsonb)
) as v(sku, name, price_kurus, metadata)
where slug = 'nfc-kart'
on conflict (sku) do update set
  name = excluded.name,
  price_kurus = excluded.price_kurus,
  billing_period = excluded.billing_period,
  metadata = excluded.metadata,
  is_active = false;

create or replace function public.create_organization_tenant(
  p_actor_user_id uuid,
  p_name text,
  p_slug text,
  p_tax_number text,
  p_tax_office text,
  p_legal_address text,
  p_city text,
  p_district text,
  p_country text,
  p_employee_limit integer,
  p_digital_card_limit integer,
  p_physical_card_limit integer,
  p_mail_credit_limit integer,
  p_storage_bytes bigint,
  p_status text,
  p_plan_code text,
  p_billing_period text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.business_plans%rowtype;
  v_organization public.organizations%rowtype;
  v_subscription public.organization_subscriptions%rowtype;
  v_status text := coalesce(nullif(trim(p_status), ''), 'ACTIVE');
  v_mail_limit integer;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_tax_number), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;
  if v_status not in ('ACTIVE', 'SUSPENDED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATUS');
  end if;
  if p_employee_limit is null or p_employee_limit <= 0 then
    return jsonb_build_object('ok', false, 'code', 'SEAT_LIMIT_REQUIRED');
  end if;
  if exists (select 1 from public.organizations where tax_number = trim(p_tax_number)) then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_TAX_NUMBER');
  end if;

  select * into v_plan from public.business_plans where code = p_plan_code and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PLAN_NOT_FOUND');
  end if;

  v_mail_limit := coalesce(p_mail_credit_limit, public.network_mail_grant(p_employee_limit));

  insert into public.organizations (
    name, slug, status, corporate_id, tax_number, tax_office, legal_address, city, district, country, created_by
  ) values (
    trim(p_name),
    trim(p_slug),
    v_status,
    public.allocate_corporate_id(),
    trim(p_tax_number),
    nullif(trim(p_tax_office), ''),
    nullif(trim(p_legal_address), ''),
    nullif(trim(p_city), ''),
    nullif(trim(p_district), ''),
    coalesce(nullif(trim(p_country), ''), 'Türkiye'),
    p_actor_user_id
  ) returning * into v_organization;

  insert into public.organization_subscriptions (organization_id, plan_id, status, starts_at, expires_at, seat_limit, billing_period)
  values (v_organization.id, v_plan.id, 'ACTIVE', now(), p_expires_at, p_employee_limit, coalesce(nullif(trim(p_billing_period), ''), 'YEARLY'))
  returning * into v_subscription;

  insert into public.organization_entitlements (
    organization_id, employee_limit, digital_card_limit, physical_card_limit, mail_credit_limit, mail_credits_remaining, storage_bytes
  ) values (
    v_organization.id,
    p_employee_limit,
    coalesce(p_digital_card_limit, p_employee_limit),
    coalesce(p_physical_card_limit, p_employee_limit),
    v_mail_limit,
    v_mail_limit,
    coalesce(p_storage_bytes, 10 * 1024 * 1024 * 1024)
  );

  insert into public.admin_audit_log (actor_user_id, action, target_table, target_id, before_value, after_value)
  values (
    p_actor_user_id,
    'ORGANIZATION_TENANT_CREATED',
    'organizations',
    v_organization.id::text,
    null,
    jsonb_build_object('corporate_id', v_organization.corporate_id, 'tax_number', v_organization.tax_number, 'employee_limit', p_employee_limit, 'mail_credit_limit', v_mail_limit)
  );

  return jsonb_build_object('ok', true, 'organization', to_jsonb(v_organization), 'subscription', to_jsonb(v_subscription));
exception
  when unique_violation then
    if sqlerrm ilike '%tax_number%' then
      return jsonb_build_object('ok', false, 'code', 'DUPLICATE_TAX_NUMBER');
    end if;
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_SLUG_OR_MEMBER');
end;
$$;

revoke all on function public.create_organization_tenant(uuid,text,text,text,text,text,text,text,text,integer,integer,integer,integer,bigint,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.create_organization_tenant(uuid,text,text,text,text,text,text,text,text,integer,integer,integer,integer,bigint,text,text,text,timestamptz) to service_role;
