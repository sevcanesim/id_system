-- Public corporate catalog: 2 / 3 / 5 / 10 / 25 (featured) / 50 / 100.
-- CORP-4, CORP-20 and CORP-75 leave new sales. Existing subscriptions keep the plan row.

update public.business_plans as plans
set annual_price_kurus = v.price_kurus,
    monthly_price_kurus = null,
    is_active = true
from (values
  ('CORP-2', 349000),
  ('CORP-3', 499000),
  ('CORP-5', 749000),
  ('CORP-10', 1290000),
  ('CORP-25', 2990000),
  ('CORP-50', 5490000),
  ('CORP-100', 9990000)
) as v(code, price_kurus)
where plans.code = v.code;

update public.product_variants as variants
set price_kurus = v.price_kurus,
    is_active = true
from (values
  ('YENOMI-CORP-2', 349000),
  ('YENOMI-CORP-3', 499000),
  ('YENOMI-CORP-5', 749000),
  ('YENOMI-CORP-10', 1290000),
  ('YENOMI-CORP-25', 2990000),
  ('YENOMI-CORP-50', 5490000),
  ('YENOMI-CORP-100', 9990000)
) as v(sku, price_kurus)
where variants.sku = v.sku;

update public.business_plans
set is_active = false
where code in ('CORP-4', 'CORP-20', 'CORP-75');

update public.product_variants
set is_active = false
where sku in ('YENOMI-CORP-4', 'YENOMI-CORP-20', 'YENOMI-CORP-75');

update public.business_plans
set annual_price_kurus = 1290000
where code = 'STARTER';

update public.business_plans
set annual_price_kurus = 2990000
where code = 'GROWTH';

update public.business_plans
set annual_price_kurus = 5490000
where code = 'BUSINESS';

update public.product_variants set price_kurus = 159000 where sku = 'YENOMI-BUSINESS-SEATS-1';
update public.product_variants set price_kurus = 279000 where sku = 'YENOMI-BUSINESS-SEATS-2';
update public.product_variants set price_kurus = 409000 where sku = 'YENOMI-BUSINESS-SEATS-3';
update public.product_variants set price_kurus = 549000 where sku = 'YENOMI-BUSINESS-SEATS-5';
update public.product_variants set price_kurus = 1049000 where sku = 'YENOMI-BUSINESS-SEATS-10';

update public.identity_package_catalog
set live = false
where code in ('CORP-4', 'CORP-20', 'CORP-75');
