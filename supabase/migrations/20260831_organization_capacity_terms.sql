create table if not exists public.organization_capacity_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_order_id uuid null references public.commerce_orders(id) on delete set null,
  renewed_from_id uuid null references public.organization_capacity_terms(id) on delete set null,
  card_count integer not null check (card_count > 0),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  renewal_price_kurus integer null check (renewal_price_kurus is null or renewal_price_kurus >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_capacity_terms_valid_period check (expires_at > starts_at)
);

create unique index if not exists organization_capacity_terms_source_order_uidx
  on public.organization_capacity_terms(source_order_id)
  where source_order_id is not null;

create index if not exists organization_capacity_terms_org_status_expiry_idx
  on public.organization_capacity_terms(organization_id, status, expires_at);

alter table public.organization_capacity_terms enable row level security;

revoke all on table public.organization_capacity_terms from anon, authenticated;
grant select on table public.organization_capacity_terms to authenticated;

create policy organization_capacity_terms_member_read
  on public.organization_capacity_terms
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = organization_capacity_terms.organization_id
        and member.user_id = auth.uid()
        and member.status = 'ACTIVE'
    )
  );

comment on table public.organization_capacity_terms is
  'Independent 365-day corporate card-capacity renewal terms. Each paid capacity purchase keeps its own start, expiry and renewal price.';

comment on column public.organization_capacity_terms.renewal_price_kurus is
  'Snapshot renewal amount for this capacity term in minor TRY units. Null means the renewal price has not been finalized.';
