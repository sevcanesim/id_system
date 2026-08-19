-- v22: Sipariş numarası formatı iyileştirmesi.
-- Eski format (007'de tanımlı): 'YI-' + rastgele UUID parçası — tarih içermiyor,
-- sıralı değil, telefonda okunması zor, müşteri destek sürecinde zayıf.
-- Yeni format: YI-YYMMDD-XXXX (tarih + 4 karakterlik kısa güvenli kod).
-- Mevcut siparişlerin numaraları GERİYE DÖNÜK DEĞİŞTİRİLMEZ (zaten müşteriye
-- iletilmiş, e-posta/kargo evraklarında geçmiş olabilir) — yalnız BUNDAN
-- SONRAKİ siparişler yeni formatta üretilir.

create or replace function public.generate_commerce_order_number()
returns text
language sql
volatile
as $$
  select 'YI-' || to_char(now(), 'YYMMDD') || '-' ||
         upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
$$;

alter table public.commerce_orders
  alter column order_number set default public.generate_commerce_order_number();

comment on function public.generate_commerce_order_number() is
  'YI-YYMMDD-XXXX formatında okunabilir sipariş numarası üretir. Bkz. migration 013.';
