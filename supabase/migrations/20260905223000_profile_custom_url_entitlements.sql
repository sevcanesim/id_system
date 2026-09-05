-- A readable profile alias is a separately purchased optional capability.
-- The NFC/QR target stays the opaque, immutable card_profiles.public_id.
-- Do not use this table for search-indexing consent: that preference remains
-- card_profiles.search_indexing_enabled and defaults to false.

create table if not exists public.profile_custom_url_entitlements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.card_profiles(id) on delete cascade,
  order_item_id uuid unique references public.commerce_order_items(id) on delete restrict,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED', 'EXPIRED')),
  grant_source text not null check (grant_source in ('LEGACY', 'ORDER', 'ADMIN')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  terms_version text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at),
  check (
    (grant_source = 'ORDER' and order_item_id is not null)
    or (grant_source in ('LEGACY', 'ADMIN') and order_item_id is null)
  )
);

create index if not exists profile_custom_url_entitlements_active_idx
  on public.profile_custom_url_entitlements(profile_id, status, expires_at);

alter table public.profile_custom_url_entitlements enable row level security;
revoke all on table public.profile_custom_url_entitlements from anon, authenticated, public;
grant all on table public.profile_custom_url_entitlements to service_role;

-- Existing aliases keep working. This migration never exposes a historical
-- readable URL to a new user and never changes the canonical public_id.
insert into public.profile_custom_url_entitlements(profile_id, status, grant_source)
select cp.id, 'ACTIVE', 'LEGACY'
from public.card_profiles cp
where nullif(btrim(cp.slug), '') is not null
on conflict (profile_id) do nothing;

comment on table public.profile_custom_url_entitlements is
  'Ücretli/atanmış okunabilir profil adresi hakkı. public_id NFC ve QR için değişmez ana adrestir; search indexing tercihi bu tablodan bağımsızdır.';
