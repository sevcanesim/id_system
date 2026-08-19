-- v24.8: Repair migration for environments where migration history/schema cache
-- says analytics is present but PostgREST cannot resolve public.card_view_events.
-- Idempotent and safe on databases where 030_card_view_analytics.sql already ran.

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

alter table public.card_view_events enable row level security;

-- Supabase/PostgREST schema cache refresh.
NOTIFY pgrst, 'reload schema';
