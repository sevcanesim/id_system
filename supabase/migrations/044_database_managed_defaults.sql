-- v25.8.10: Runtime/business defaults live in PostgreSQL, not UI source files.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.legal_documents (
  code text primary key,
  title text not null,
  version text not null,
  effective_at date not null,
  content jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.corporate_template_options (
  code text primary key,
  title text not null,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_link_slot_definitions (
  kind text primary key,
  default_label text not null,
  default_subtitle text not null,
  icon text not null default 'external',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists sku text;
alter table public.products add column if not exists category text;
alter table public.products add column if not exists status text not null default 'AVAILABLE';
alter table public.products add column if not exists presentation jsonb not null default '{}'::jsonb;
create unique index if not exists products_sku_unique on public.products(sku) where sku is not null;

alter table public.app_settings enable row level security;
alter table public.legal_documents enable row level security;
alter table public.corporate_template_options enable row level security;
alter table public.organization_link_slot_definitions enable row level security;

drop policy if exists "Public can read public app settings" on public.app_settings;
create policy "Public can read public app settings" on public.app_settings
  for select using (is_public = true);
drop policy if exists "Public can read active legal documents" on public.legal_documents;
create policy "Public can read active legal documents" on public.legal_documents
  for select using (is_active = true);
drop policy if exists "Public can read corporate template options" on public.corporate_template_options;
create policy "Public can read corporate template options" on public.corporate_template_options
  for select using (is_active = true);
drop policy if exists "Public can read organization link slots" on public.organization_link_slot_definitions;
create policy "Public can read organization link slots" on public.organization_link_slot_definitions
  for select using (is_active = true);

insert into public.app_settings(key,value,description,is_public) values
  ('commerce.service_lifecycle', '{"serviceTermDays":365,"graceDays":7,"activationLinkDays":7,"activationResendHours":24,"activationMaxDelayDays":30}'::jsonb, 'Hizmet ve aktivasyon süreleri', true),
  ('commerce.shipping', '{"domesticOnly":true,"countryCode":"TR","shippingPriceKurus":0}'::jsonb, 'Teslimat politikası', true),
  ('site.identity', '{"brandName":"Yenomi ID","companyName":"Yenomi Labs","supportEmail":"destek@yenomi.com","salesEmail":"satis@yenomi.com","siteUrl":"https://id.yenomi.com"}'::jsonb, 'Marka ve iletişim bilgileri', true)
on conflict(key) do update set value=excluded.value,description=excluded.description,is_public=excluded.is_public,updated_at=now();

insert into public.legal_documents(code,title,version,effective_at,content,is_active) values
  ('DISTANCE_SALES','Mesafeli Satış Sözleşmesi','2026-08-07','2026-08-07','{}',true),
  ('PERSONALIZATION','Kişiselleştirilmiş Ürün Onayı','2026-08-07','2026-08-07','{}',true),
  ('PRIVACY','Gizlilik ve KVKK','2026-08-07','2026-08-07','{}',true)
on conflict(code) do update set title=excluded.title,version=excluded.version,effective_at=excluded.effective_at,is_active=true,updated_at=now();

insert into public.corporate_template_options(code,title,description,sort_order,metadata) values
  ('ESSENTIAL','Corporate Essential','Sade, hızlı ve tüm çalışanlar için güvenli varsayılan',10,'{"default":true}'),
  ('PROFESSIONAL','Corporate Professional','Satış, müşteri ilişkileri ve uzmanlık bilgileri için daha zengin',20,'{}'),
  ('EXECUTIVE','Corporate Executive','Üst yönetim için koyu, premium ve marka odaklı görünüm',30,'{}')
on conflict(code) do update set title=excluded.title,description=excluded.description,sort_order=excluded.sort_order,metadata=excluded.metadata,is_active=true,updated_at=now();

insert into public.organization_link_slot_definitions(kind,default_label,default_subtitle,icon,sort_order) values
  ('CATALOG','Ürün Kataloğu','Kurumsal ürün ve hizmetler','external',10),
  ('PRESENTATION','Şirket Sunumu','Kurumsal sunum','external',20),
  ('MEETING','Toplantı Planla','Randevu oluştur','external',30),
  ('REFERENCES','Referans Projeler','Projeleri incele','external',40)
on conflict(kind) do update set default_label=excluded.default_label,default_subtitle=excluded.default_subtitle,icon=excluded.icon,sort_order=excluded.sort_order,is_active=true,updated_at=now();

update public.products set slug='nfc-kart' where slug='nfc-business-card';

update public.products set
  sku='YENOMI-NFC-CARD', category='NFC', status='AVAILABLE',
  presentation='{"shortDescription":"Kişisel QR ve NFC özellikli premium fiziksel kart.","shippingIncluded":true,"countryCode":"TR","features":["1 yıllık dijital profil","NFC + kişisel QR","Kargo dahil"]}'::jsonb
where slug='nfc-kart';

-- Extra card becomes a first-class DB variant instead of a source constant.
insert into public.product_variants(product_id,sku,name,price_kurus,billing_period,metadata,is_active)
select id,'YENOMI-NFC-EXTRA','Yenomi ID Ek / Yedek NFC Kart',38900,'ONE_TIME',
  '{"requires_active_entitlement":true,"shipping_included":true,"country":"TR"}'::jsonb,true
from public.products where slug='nfc-kart'
on conflict(sku) do update set name=excluded.name,price_kurus=excluded.price_kurus,billing_period=excluded.billing_period,metadata=excluded.metadata,is_active=true;

update public.products set
  sku='YENOMI-BUSINESS-SEAT-PACK', category='NFC', status='AVAILABLE',
  presentation='{"audience":"CORPORATE","features":["1 yıllık kullanım","NFC + kişisel QR","Kargo dahil"],"recommendedSeatCount":5}'::jsonb
where slug='yenomi-business-seat-pack';
