-- Reconcile the live individual catalog with the commercial source of truth.
-- Older environments can have an inactive NFC product or a missing Premium
-- variant, which previously surfaced as a generic checkout 500 response.

update public.products
set is_active = true,
    status = 'AVAILABLE'
where slug = 'nfc-kart';

insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata, is_active)
select
  p.id,
  'YENOMI-NFC-CARD-ANNUAL',
  'Yenomi ID — NFC Kart',
  149000,
  'YEARLY',
  jsonb_build_object(
    'fulfillment_kind', 'INITIAL_BUNDLE',
    'digital_service_included', true,
    'physical_card_count', 1,
    'service_days', 365,
    'shipping_included', true,
    'country', 'TR',
    'preparation_business_days', 2,
    'package_code', 'INDIVIDUAL'
  ),
  true
from public.products p
where p.slug = 'nfc-kart'
on conflict (sku) do update set
  product_id = excluded.product_id,
  name = excluded.name,
  price_kurus = excluded.price_kurus,
  billing_period = excluded.billing_period,
  metadata = excluded.metadata,
  is_active = true;

insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata, is_active)
select
  p.id,
  'YENOMI-NFC-PREMIUM-ANNUAL',
  'Yenomi ID Premium — NFC + 100 Network Mail',
  249000,
  'YEARLY',
  jsonb_build_object(
    'fulfillment_kind', 'INITIAL_BUNDLE',
    'digital_service_included', true,
    'physical_card_count', 1,
    'service_days', 365,
    'shipping_included', true,
    'country', 'TR',
    'preparation_business_days', 2,
    'package_code', 'INDIVIDUAL_PREMIUM',
    'network_mail_credits', 100
  ),
  true
from public.products p
where p.slug = 'nfc-kart'
on conflict (sku) do update set
  product_id = excluded.product_id,
  name = excluded.name,
  price_kurus = excluded.price_kurus,
  billing_period = excluded.billing_period,
  metadata = excluded.metadata,
  is_active = true;
