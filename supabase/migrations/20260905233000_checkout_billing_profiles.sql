-- Every paid or pending checkout needs an immutable billing snapshot. The
-- organization profile remains the current source of truth, while this table
-- preserves what was actually used for a particular order and invoice.

create table if not exists public.commerce_order_billing_profiles (
  order_id uuid primary key references public.commerce_orders(id) on delete cascade,
  billing_type text not null check (billing_type in ('INDIVIDUAL', 'CORPORATE')),
  organization_id uuid references public.organizations(id) on delete set null,
  legal_name text not null,
  tax_number text,
  tax_office text,
  contact_name text not null,
  email text not null,
  phone text not null,
  address_line text not null,
  district text not null,
  city text not null,
  postal_code text,
  country_code text not null default 'TR' check (country_code = 'TR'),
  created_at timestamptz not null default now(),
  check (
    (billing_type = 'INDIVIDUAL' and organization_id is null)
    or (billing_type = 'CORPORATE' and organization_id is not null)
  )
);

create index if not exists commerce_order_billing_profiles_organization_idx
  on public.commerce_order_billing_profiles(organization_id, created_at desc);

alter table public.commerce_order_billing_profiles enable row level security;

drop policy if exists "Order owners can read billing snapshots" on public.commerce_order_billing_profiles;
create policy "Order owners can read billing snapshots"
  on public.commerce_order_billing_profiles for select to authenticated using (
    exists (
      select 1 from public.commerce_orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

drop policy if exists "Company owner and HR can read corporate billing snapshots" on public.commerce_order_billing_profiles;
create policy "Company owner and HR can read corporate billing snapshots"
  on public.commerce_order_billing_profiles for select to authenticated using (
    organization_id is not null
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = commerce_order_billing_profiles.organization_id
        and m.user_id = auth.uid()
        and m.status = 'ACTIVE'
        and m.role in ('OWNER', 'HR')
    )
  );

-- Older corporate tenants kept their verified activation address in the
-- original tenant columns. Normalize it into the canonical billing profile
-- once, without inventing any company or tax data.
select set_config('app.yenomi_admin_legal_update', 'on', true);

update public.organizations
set
  legal_name = coalesce(nullif(trim(legal_name), ''), nullif(trim(name), '')),
  billing_address = coalesce(nullif(trim(billing_address), ''), nullif(trim(legal_address), '')),
  billing_city = coalesce(nullif(trim(billing_city), ''), nullif(trim(city), '')),
  billing_district = coalesce(nullif(trim(billing_district), ''), nullif(trim(district), '')),
  billing_country_code = coalesce(nullif(trim(billing_country_code), ''), 'TR')
where
  nullif(trim(coalesce(legal_name, '')), '') is null
  or nullif(trim(coalesce(billing_address, '')), '') is null
  or nullif(trim(coalesce(billing_city, '')), '') is null
  or nullif(trim(coalesce(billing_district, '')), '') is null;
