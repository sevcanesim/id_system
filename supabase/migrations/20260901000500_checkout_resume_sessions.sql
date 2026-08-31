create table if not exists public.commerce_checkout_sessions (
  order_id uuid primary key references public.commerce_orders(id) on delete cascade,
  draft_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_checkout_sessions_payload_object check (jsonb_typeof(draft_payload) = 'object')
);

create index if not exists commerce_checkout_sessions_expiry_idx
  on public.commerce_checkout_sessions(expires_at);

alter table public.commerce_checkout_sessions enable row level security;
revoke all on public.commerce_checkout_sessions from anon, authenticated;
grant all on public.commerce_checkout_sessions to service_role;

comment on table public.commerce_checkout_sessions is
  'Sanitized checkout resume snapshots. Identity numbers and acceptance state are intentionally excluded.';
