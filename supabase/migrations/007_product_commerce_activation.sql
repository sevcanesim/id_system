-- Yenomi ID genel ürün/sepet/sipariş/aktivasyon omurgası.
-- NFC kartvizit, Sağlık Kartı ve gelecekteki kimlik ürünleri aynı yapıyı kullanır.
do $$ begin
  create type public.product_kind as enum ('BUSINESS_CARD','HEALTH_CARD','NFC_PHYSICAL_CARD','PET_ID','VEHICLE_ID');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.commerce_order_status as enum ('DRAFT','AWAITING_PAYMENT','PAID','PREPARING','SHIPPED','COMPLETED','CANCELLED','REFUNDED');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.entitlement_status as enum ('PENDING_ACTIVATION','ACTIVE','EXPIRED','REVOKED');
exception when duplicate_object then null; end $$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  kind public.product_kind not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text unique not null,
  name text not null,
  price_kurus integer not null check (price_kurus >= 0),
  billing_period text check (billing_period in ('ONE_TIME','YEARLY')),
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.commerce_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('YI-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))),
  user_id uuid references auth.users(id) on delete set null,
  guest_email text not null,
  status public.commerce_order_status not null default 'DRAFT',
  currency text not null default 'TRY',
  subtotal_kurus integer not null default 0,
  shipping_kurus integer not null default 0,
  total_kurus integer not null default 0,
  activation_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commerce_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid references public.product_variants(id),
  product_kind public.product_kind not null,
  product_name text not null,
  unit_price_kurus integer not null,
  quantity integer not null check (quantity between 1 and 100),
  configuration jsonb not null default '{}'::jsonb
);

create table if not exists public.shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique not null references public.commerce_orders(id) on delete cascade,
  recipient_name text not null,
  phone text not null,
  address_line text not null,
  district text not null,
  city text not null,
  postal_code text,
  latitude double precision,
  longitude double precision,
  map_url text,
  delivery_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  order_item_id uuid unique not null references public.commerce_order_items(id) on delete cascade,
  kind public.product_kind not null,
  status public.entitlement_status not null default 'PENDING_ACTIVATION',
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.activation_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.commerce_orders enable row level security;
alter table public.commerce_order_items enable row level security;
alter table public.shipping_addresses enable row level security;
alter table public.entitlements enable row level security;
alter table public.activation_tokens enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products" on public.products for select using (is_active = true);
drop policy if exists "Public can read active variants" on public.product_variants;
create policy "Public can read active variants" on public.product_variants for select using (is_active = true);
drop policy if exists "Users can read claimed orders" on public.commerce_orders;
create policy "Users can read claimed orders" on public.commerce_orders for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can read own order items" on public.commerce_order_items;
create policy "Users can read own order items" on public.commerce_order_items for select to authenticated using (exists(select 1 from public.commerce_orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists "Users can read own shipping" on public.shipping_addresses;
create policy "Users can read own shipping" on public.shipping_addresses for select to authenticated using (exists(select 1 from public.commerce_orders o where o.id=order_id and o.user_id=auth.uid()));
drop policy if exists "Users can read own entitlements" on public.entitlements;
create policy "Users can read own entitlements" on public.entitlements for select to authenticated using (auth.uid() = user_id);

insert into public.products(slug,name,kind,description)
values ('nfc-business-card','Yenomi ID NFC + QR Kart','NFC_PHYSICAL_CARD','Fiziksel NFC kart, kişisel QR ve dijital kartvizit erişimi')
on conflict (slug) do nothing;
