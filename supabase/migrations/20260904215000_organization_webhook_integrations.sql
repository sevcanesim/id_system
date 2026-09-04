-- Signed outbound webhooks are the vendor-neutral CRM integration surface.
-- Native OAuth connectors can use the same delivery queue later.
create table if not exists public.organization_integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'WEBHOOK' check (provider in ('WEBHOOK')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISABLED')),
  endpoint_url text not null,
  signing_secret_encrypted text not null,
  event_types text[] not null default array['LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'MEETING_STATUS_CHANGED']::text[],
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create table if not exists public.organization_integration_delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.organization_integrations(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'DELIVERED', 'RETRYABLE', 'FAILED')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_integration_delivery_pending_idx
  on public.organization_integration_delivery_jobs (status, next_attempt_at, created_at)
  where status in ('PENDING', 'RETRYABLE');

alter table public.organization_integrations enable row level security;
alter table public.organization_integration_delivery_jobs enable row level security;
revoke all on public.organization_integrations from anon, authenticated, public;
revoke all on public.organization_integration_delivery_jobs from anon, authenticated, public;
grant all on public.organization_integrations to service_role;
grant all on public.organization_integration_delivery_jobs to service_role;
