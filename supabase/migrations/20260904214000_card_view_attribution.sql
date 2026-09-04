-- Attribution is intentionally limited to an owned source taxonomy and a
-- short campaign label. We never persist ad click IDs, IPs or raw UTM data.
alter table public.card_view_events
  add column if not exists source text not null default 'DIRECT',
  add column if not exists campaign text;

alter table public.card_view_events
  drop constraint if exists card_view_events_source_check;
alter table public.card_view_events
  add constraint card_view_events_source_check
  check (source in ('QR', 'NFC', 'EVENT', 'SHARE', 'DIRECT'));

create index if not exists card_view_events_source_viewed_idx
  on public.card_view_events (source, viewed_at desc);
