-- Yenomi ID NFC Orders schema
-- Idempotent / tekrar çalıştırılabilir sürüm

create extension if not exists pgcrypto;

-- Enum PostgreSQL'de CREATE TYPE IF NOT EXISTS desteklemediği için güvenli blok.
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'nfc_order_status'
  ) then
    create type public.nfc_order_status as enum (
      'NEW',
      'CONTACTED',
      'IN_PRODUCTION',
      'SHIPPED',
      'COMPLETED',
      'CANCELLED'
    );
  end if;
end
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.nfc_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references public.card_profiles(id) on delete set null,
  card_name text not null,
  card_color text not null
    check (card_color in ('BLACK', 'WHITE', 'PURPLE')),
  print_name text not null,
  print_title text,
  phone text not null,
  email text not null,
  address_line text not null,
  district text not null,
  city text not null,
  postal_code text,
  quantity integer not null default 1
    check (quantity between 1 and 100),
  note text,
  status public.nfc_order_status not null default 'NEW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sorgu performansı için indexler
create index if not exists nfc_orders_user_id_idx
  on public.nfc_orders (user_id);

create index if not exists nfc_orders_profile_id_idx
  on public.nfc_orders (profile_id);

create index if not exists nfc_orders_status_idx
  on public.nfc_orders (status);

create index if not exists nfc_orders_created_at_idx
  on public.nfc_orders (created_at desc);

-- updated_at fonksiyonu yoksa oluştur
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.admin_users enable row level security;
alter table public.nfc_orders enable row level security;

-- Policy'leri tekrar çalıştırılabilir hâle getir
drop policy if exists
  "Users can see own admin membership"
on public.admin_users;

create policy "Users can see own admin membership"
on public.admin_users
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists
  "Users can create own NFC orders"
on public.nfc_orders;

create policy "Users can create own NFC orders"
on public.nfc_orders
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists
  "Users can read own NFC orders"
on public.nfc_orders;

create policy "Users can read own NFC orders"
on public.nfc_orders
for select
to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

drop policy if exists
  "Admins can update NFC orders"
on public.nfc_orders;

create policy "Admins can update NFC orders"
on public.nfc_orders
for update
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Adminlerin sipariş silebilmesi isteniyorsa bu policy aktif kalabilir.
drop policy if exists
  "Admins can delete NFC orders"
on public.nfc_orders;

create policy "Admins can delete NFC orders"
on public.nfc_orders
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users a
    where a.user_id = auth.uid()
  )
);

drop trigger if exists nfc_orders_set_updated_at
on public.nfc_orders;

create trigger nfc_orders_set_updated_at
before update on public.nfc_orders
for each row
execute function public.set_updated_at();

-- İlk yönetici hesabını eklemek için:
-- Supabase Dashboard > Authentication > Users bölümünden UUID'yi kopyala.
--
-- insert into public.admin_users (user_id)
-- values ('AUTH-USER-UUID')
-- on conflict (user_id) do nothing;
