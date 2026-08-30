alter table public.card_view_events
  add column if not exists visitor_fingerprint text;

create index if not exists card_view_events_profile_fingerprint_viewed_idx
  on public.card_view_events(profile_id, visitor_fingerprint, viewed_at desc)
  where visitor_fingerprint is not null;
