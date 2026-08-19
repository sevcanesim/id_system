-- v23.9: corporate seat/card add-on products and small demo business plans.

insert into public.products(slug,name,kind,description,is_active)
values('nfc-business-card','Yenomi ID NFC + QR Kart','NFC_PHYSICAL_CARD',
  'Fiziksel NFC kart, kişisel QR ve dijital kartvizit erişimi',true)
on conflict(slug) do update set name=excluded.name,description=excluded.description,is_active=true;

insert into public.product_variants(product_id,sku,name,price_kurus,billing_period,metadata)
select id,'YENOMI-NFC-CARD-ANNUAL','NFC + QR Kart ve 1 Yıllık Dijital Sayfa',69900,'YEARLY',
  '{"shippingIncluded":true,"country":"TR","preparationBusinessDays":2}'::jsonb
from public.products where slug='nfc-business-card'
on conflict(sku) do update set price_kurus=excluded.price_kurus,metadata=excluded.metadata,is_active=true;

insert into public.products(slug,name,kind,description,is_active)
values('yenomi-business-seat-pack','Yenomi Business Ek Kullanıcı + Kart','NFC_PHYSICAL_CARD',
  'Aktif Yenomi Business aboneliğine ek kullanıcı lisansı ve kişisel NFC + QR kart.',true)
on conflict(slug) do update set name=excluded.name,description=excluded.description,is_active=true;

insert into public.product_variants(product_id,sku,name,price_kurus,billing_period,metadata)
select p.id,v.sku,v.name,v.price,'YEARLY',jsonb_build_object(
  'seat_count',v.seats,'physical_card_count',v.seats,'requires_active_business_subscription',true,
  'shipping_included',true,'country','TR','service_days',365,'grace_days',7
)
from public.products p
cross join(values
  ('YENOMI-BUSINESS-SEATS-1','Ek 1 Kullanıcı + 1 Yenomi ID Kart',84900,1),
  ('YENOMI-BUSINESS-SEATS-2','Ek 2 Kullanıcı + 2 Yenomi ID Kart',159000,2),
  ('YENOMI-BUSINESS-SEATS-3','Ek 3 Kullanıcı + 3 Yenomi ID Kart',229000,3),
  ('YENOMI-BUSINESS-SEATS-5','Ek 5 Kullanıcı + 5 Yenomi ID Kart',359000,5),
  ('YENOMI-BUSINESS-SEATS-10','Ek 10 Kullanıcı + 10 Yenomi ID Kart',649000,10)
)as v(sku,name,price,seats)
where p.slug='yenomi-business-seat-pack'
on conflict(sku) do update set name=excluded.name,price_kurus=excluded.price_kurus,
  billing_period=excluded.billing_period,metadata=excluded.metadata,is_active=true;

insert into public.business_plans(code,name,seat_limit,annual_price_kurus,features,is_active) values
('DEMO-2','Business 2',2,169800,'["2 kullanıcı","2 NFC + QR kart","Kurumsal panel"]',true),
('DEMO-5','Business 5',5,399000,'["5 kullanıcı","5 NFC + QR kart","Kurumsal panel"]',true),
('DEMO-10','Business 10',10,749000,'["10 kullanıcı","10 NFC + QR kart","Kurumsal panel"]',true)
on conflict(code) do update set name=excluded.name,seat_limit=excluded.seat_limit,
  annual_price_kurus=excluded.annual_price_kurus,features=excluded.features,is_active=true;
