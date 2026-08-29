-- Rebalance corporate annual pricing so the team-management tier starts above
-- the individual Premium offer while preserving a clear volume discount curve.
-- Keep database catalog, checkout variants, legacy aliases and seat add-ons aligned.

update public.business_plans as plans
set annual_price_kurus = v.price_kurus,
    monthly_price_kurus = null,
    is_active = true
from (values
  ('CORP-2', 549000),
  ('CORP-3', 749000),
  ('CORP-5', 1199000),
  ('CORP-10', 2190000),
  ('CORP-25', 4990000),
  ('CORP-50', 8990000),
  ('CORP-100', 15990000)
) as v(code, price_kurus)
where plans.code = v.code;

update public.product_variants as variants
set price_kurus = v.price_kurus,
    is_active = true
from (values
  ('YENOMI-CORP-2', 549000),
  ('YENOMI-CORP-3', 749000),
  ('YENOMI-CORP-5', 1199000),
  ('YENOMI-CORP-10', 2190000),
  ('YENOMI-CORP-25', 4990000),
  ('YENOMI-CORP-50', 8990000),
  ('YENOMI-CORP-100', 15990000)
) as v(sku, price_kurus)
where variants.sku = v.sku;

-- Legacy plan codes remain valid for existing tenant history, but their prices
-- must stay aligned with the canonical corporate package they alias.
update public.business_plans set annual_price_kurus = 2190000 where code = 'STARTER';
update public.business_plans set annual_price_kurus = 4990000 where code = 'GROWTH';
update public.business_plans set annual_price_kurus = 8990000 where code = 'BUSINESS';

-- Mid-cycle add-ons intentionally cost more than jumping to the nearest
-- official package where an equivalent upgrade exists.
update public.product_variants set price_kurus = 279000, is_active = true where sku = 'YENOMI-BUSINESS-SEATS-1';
update public.product_variants set price_kurus = 1099000, is_active = true where sku = 'YENOMI-BUSINESS-SEATS-5';
update public.product_variants set price_kurus = 1999000, is_active = true where sku = 'YENOMI-BUSINESS-SEATS-10';

-- Historical +2/+3 add-ons remain unavailable for new sales.
update public.product_variants
set is_active = false
where sku in ('YENOMI-BUSINESS-SEATS-2', 'YENOMI-BUSINESS-SEATS-3');