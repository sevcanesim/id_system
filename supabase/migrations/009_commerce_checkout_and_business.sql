-- v21: misafir checkout, ödeme sonrası aktivasyon ve kurumsal paket temeli.

alter table public.commerce_orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists country_code text not null default 'TR',
  add column if not exists paid_at timestamptz;

alter table public.commerce_orders
  drop constraint if exists commerce_orders_country_code_check;
alter table public.commerce_orders
  add constraint commerce_orders_country_code_check check (country_code = 'TR');

alter table public.shipping_addresses
  add column if not exists country_code text not null default 'TR';
alter table public.shipping_addresses
  drop constraint if exists shipping_addresses_country_code_check;
alter table public.shipping_addresses
  add constraint shipping_addresses_country_code_check check (country_code = 'TR');

-- Bir sipariş kaleminde adet > 1 olduğunda her fiziksel/dijital hak ayrı izlenir.
alter table public.entitlements drop constraint if exists entitlements_order_item_id_key;
alter table public.entitlements add column if not exists instance_no integer not null default 1;
create unique index if not exists entitlements_order_item_instance_uidx
  on public.entitlements(order_item_id, instance_no);

create table if not exists public.commerce_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  provider text not null default 'IYZICO',
  status text not null check (status in ('PENDING','PAID','FAILED')),
  amount_kurus integer not null check (amount_kurus >= 0),
  currency text not null default 'TRY',
  conversation_id text not null,
  provider_token text unique,
  provider_payment_id text,
  request_fingerprint text,
  error_code text,
  error_message text,
  raw_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commerce_payment_attempts_order_idx on public.commerce_payment_attempts(order_id);
create index if not exists commerce_payment_attempts_status_idx on public.commerce_payment_attempts(status);
alter table public.commerce_payment_attempts enable row level security;

-- Ana bireysel paket ve yıllık lisans varyantı.
insert into public.product_variants(product_id,sku,name,price_kurus,billing_period,metadata)
select id,'YENOMI-NFC-CARD-ANNUAL','NFC + QR Kart ve 1 Yıllık Dijital Sayfa',69900,'YEARLY',
  '{"shippingIncluded":true,"country":"TR","preparationBusinessDays":2}'::jsonb
from public.products where slug='nfc-business-card'
on conflict (sku) do update set price_kurus=excluded.price_kurus, metadata=excluded.metadata, is_active=true;

-- Kurumsal organizasyon altyapısı. Panel sonraki sprintte bu tablolara bağlanacak.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED','CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  full_name text,
  title text,
  department text,
  role text not null default 'EMPLOYEE' check (role in ('OWNER','ADMIN','HR','EMPLOYEE')),
  status text not null default 'INVITED' check (status in ('INVITED','ACTIVE','SUSPENDED','LEFT')),
  created_at timestamptz not null default now(),
  unique(organization_id,email)
);

create table if not exists public.business_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  seat_limit integer,
  annual_price_kurus integer,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid not null references public.business_plans(id),
  status text not null default 'PENDING' check (status in ('PENDING','ACTIVE','GRACE_PERIOD','SUSPENDED','CANCELLED')),
  starts_at timestamptz,
  expires_at timestamptz,
  seat_limit integer not null,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.business_plans enable row level security;
alter table public.organization_subscriptions enable row level security;

-- RLS helper avoids self-referential organization_members policy recursion.
create or replace function public.is_active_organization_member(
  p_organization_id uuid,
  p_allowed_roles text[] default null
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_organization_id
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
      and (p_allowed_roles is null or m.role = any(p_allowed_roles))
  );
$$;

revoke all on function public.is_active_organization_member(uuid,text[]) from public, anon;
grant execute on function public.is_active_organization_member(uuid,text[]) to authenticated, service_role;

drop policy if exists "Public can read active business plans" on public.business_plans;
create policy "Public can read active business plans" on public.business_plans for select using (is_active=true);

drop policy if exists "Members can read organization" on public.organizations;
create policy "Members can read organization" on public.organizations for select to authenticated using (
  public.is_active_organization_member(id)
);

drop policy if exists "Members can read organization members" on public.organization_members;
create policy "Members can read organization members" on public.organization_members for select to authenticated using (
  public.is_active_organization_member(organization_id)
);

insert into public.business_plans(code,name,seat_limit,annual_price_kurus,features) values
('STARTER','Starter',10,790000,'["10 dijital kimlik","10 NFC + QR kart","Ortak kurumsal şablon"]'::jsonb),
('GROWTH','Growth',25,1890000,'["25 dijital kimlik","Toplu içe aktarma","Departman yönetimi"]'::jsonb),
('BUSINESS','Business',50,3490000,'["50 dijital kimlik","Kurumsal analitik","Öncelikli üretim"]'::jsonb),
('ENTERPRISE','Enterprise',null,null,'["Özel lisans hacmi","Entegrasyonlar","Kurumsal destek"]'::jsonb)
on conflict (code) do update set name=excluded.name,seat_limit=excluded.seat_limit,annual_price_kurus=excluded.annual_price_kurus,features=excluded.features,is_active=true;
