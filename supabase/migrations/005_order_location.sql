alter table public.nfc_orders
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists map_url text;
