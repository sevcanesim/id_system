-- Yenomi ID yıllık hizmet yaşam döngüsü, kayıp modu ve Türkiye içi satış kuralları.
do $$ begin
  create type public.card_profile_status as enum ('ACTIVE','LOST','SUSPENDED','REFUNDED');
exception when duplicate_object then null;
end $$;

alter table public.card_profiles
  add column if not exists card_status public.card_profile_status not null default 'ACTIVE',
  add column if not exists service_started_at timestamptz,
  add column if not exists service_expires_at timestamptz,
  add column if not exists grace_ends_at timestamptz,
  add column if not exists lost_at timestamptz;

alter table public.commerce_orders
  add column if not exists customer_email text,
  add column if not exists country_code text not null default 'TR' check (country_code = 'TR');

alter table public.activation_tokens
  add column if not exists resend_count integer not null default 0,
  add column if not exists invalidated_at timestamptz;

create or replace function public.set_card_profile_lost_at()
returns trigger language plpgsql as $$
begin
  if new.card_status = 'LOST' and old.card_status is distinct from 'LOST' then
    new.lost_at = now();
  elsif new.card_status <> 'LOST' then
    new.lost_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists card_profiles_set_lost_at on public.card_profiles;
create trigger card_profiles_set_lost_at
before update of card_status on public.card_profiles
for each row execute function public.set_card_profile_lost_at();

-- Paket ve ek kart fiyatları sunucu tarafında doğrulanmak üzere varyant tablosuna eklenir.
insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata)
select id, 'YENOMI-NFC-ANNUAL-TR', 'NFC + QR Kart / 1 Yıllık Dijital Sayfa', 69900, 'YEARLY',
       '{"shipping_included":true,"country":"TR","preparation_business_days":2,"service_days":365,"grace_days":7}'::jsonb
from public.products where slug='nfc-business-card'
on conflict (sku) do update set price_kurus=excluded.price_kurus, metadata=excluded.metadata, is_active=true;

insert into public.product_variants(product_id, sku, name, price_kurus, billing_period, metadata)
select id, 'YENOMI-NFC-EXTRA-TR', 'Aynı Profile Bağlı Ek / Yedek Kart', 29900, 'ONE_TIME',
       '{"shipping_included":true,"country":"TR","requires_active_business_profile":true}'::jsonb
from public.products where slug='nfc-business-card'
on conflict (sku) do update set price_kurus=excluded.price_kurus, metadata=excluded.metadata, is_active=true;
