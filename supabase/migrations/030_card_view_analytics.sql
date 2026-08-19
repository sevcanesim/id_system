-- v23.22: card view analytics.
--
-- Root cause fixed: the corporate panel's "Genel Bakış" showed organizational
-- metadata (seats, roles, status) but nothing about actual card usage — no
-- view counts, no geographic breakdown. Card view events were never
-- captured anywhere, so there was nothing to aggregate.
--
-- Location is intentionally coarse (country/city from edge/CDN geo headers,
-- e.g. Vercel's x-vercel-ip-country / x-vercel-ip-city or Cloudflare's
-- cf-ipcountry) — never precise GPS coordinates, which would require
-- explicit visitor consent and is disproportionate for a card-view counter.
-- No IP address is stored.

create table if not exists public.card_view_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.card_profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  country text,
  city text,
  referrer text
);

create index if not exists card_view_events_profile_viewed_idx
  on public.card_view_events(profile_id, viewed_at desc);
create index if not exists card_view_events_viewed_at_idx
  on public.card_view_events(viewed_at desc);

-- RLS enabled with no policies: only the service-role client (used
-- server-side, after an explicit organization-manager permission check in
-- the API route, matching the existing pattern in physical-cards and
-- member-profile routes) can read or write this table. No direct client
-- access, authenticated or anonymous.
alter table public.card_view_events enable row level security;
