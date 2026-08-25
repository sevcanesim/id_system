-- Corporate seat pack commercial normalization: 1 / 5 / 10 active ladder.
-- Deactivate historical +2 and +3 seat packs from active sales while preserving SKU recognition.

update public.product_variants
set is_active = false
where sku in ('YENOMI-BUSINESS-SEATS-2', 'YENOMI-BUSINESS-SEATS-3');

update public.product_variants set price_kurus = 229000, is_active = true where sku = 'YENOMI-BUSINESS-SEATS-1';
update public.product_variants set price_kurus = 949000, is_active = true where sku = 'YENOMI-BUSINESS-SEATS-5';
update public.product_variants set price_kurus = 1699000, is_active = true where sku = 'YENOMI-BUSINESS-SEATS-10';
