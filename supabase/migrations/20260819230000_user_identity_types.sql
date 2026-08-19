-- User identity typing: every auth user stores three types in DB.
--   1. identity_product_family  (Digital ID, Pet ID, Emergency ID, …)
--   2. occupancy via account_type (INDIVIDUAL / CORPORATE / TEST overlay)
--   3. package_code             (determined by the purchased/provisioned package)
--
-- Pet ID is a product family, not a login portal. A user may hold more than
-- one family (Digital ID + Pet ID) in user_identity_types; user_accounts
-- keeps the current primary triple. Coming-soon families are catalogued with
-- live=false so checkout is not implied.

do $$ begin
  create type public.identity_product_family as enum (
    'DIGITAL_ID',
    'BUSINESS_MINI_SITE',
    'RESTAURANT',
    'EMERGENCY_ID',
    'PET_ID',
    'VEHICLE_ID'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.identity_package_catalog (
  code text primary key,
  name text not null,
  occupancy text not null check (occupancy in ('INDIVIDUAL', 'CORPORATE')),
  product_family public.identity_product_family not null,
  live boolean not null default false
);

insert into public.identity_package_catalog(code, name, occupancy, product_family, live) values
  ('UNASSIGNED', 'Paket atanmadı', 'INDIVIDUAL', 'DIGITAL_ID', false),
  ('INDIVIDUAL', 'Bireysel', 'INDIVIDUAL', 'DIGITAL_ID', true),
  ('INDIVIDUAL_PREMIUM', 'Bireysel Premium', 'INDIVIDUAL', 'DIGITAL_ID', true),
  ('CORP-2', 'Kurumsal 2', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-3', 'Kurumsal 3', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-4', 'Kurumsal 4', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-5', 'Kurumsal 5', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-10', 'Kurumsal 10', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-20', 'Kurumsal 20', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-25', 'Kurumsal 25', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-50', 'Kurumsal 50', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-75', 'Kurumsal 75', 'CORPORATE', 'DIGITAL_ID', true),
  ('CORP-100', 'Kurumsal 100', 'CORPORATE', 'DIGITAL_ID', true),
  ('DEMO-2', 'Demo 2', 'CORPORATE', 'DIGITAL_ID', true),
  ('DEMO-5', 'Demo 5', 'CORPORATE', 'DIGITAL_ID', true),
  ('DEMO-10', 'Demo 10', 'CORPORATE', 'DIGITAL_ID', true),
  ('DEMO-50', 'Demo QA 50', 'CORPORATE', 'DIGITAL_ID', false),
  ('STARTER', 'Starter (alias CORP-10)', 'CORPORATE', 'DIGITAL_ID', false),
  ('GROWTH', 'Growth (alias CORP-25)', 'CORPORATE', 'DIGITAL_ID', false),
  ('BUSINESS', 'Business (alias CORP-50)', 'CORPORATE', 'DIGITAL_ID', false),
  ('ENTERPRISE', 'Enterprise', 'CORPORATE', 'DIGITAL_ID', false),
  ('PET_ID', 'Pet ID', 'INDIVIDUAL', 'PET_ID', false),
  ('EMERGENCY_ID', 'Acil Durum Kimliği', 'INDIVIDUAL', 'EMERGENCY_ID', false),
  ('VEHICLE_ID', 'Vehicle ID', 'INDIVIDUAL', 'VEHICLE_ID', false),
  ('BUSINESS_MINI_SITE', 'İşletme Mini Sitesi', 'CORPORATE', 'BUSINESS_MINI_SITE', false),
  ('RESTAURANT', 'Restoran', 'CORPORATE', 'RESTAURANT', false)
on conflict (code) do update set
  name = excluded.name,
  occupancy = excluded.occupancy,
  product_family = excluded.product_family,
  live = excluded.live;

alter table public.user_accounts
  add column if not exists identity_product_family public.identity_product_family not null default 'DIGITAL_ID';

alter table public.user_accounts
  add column if not exists package_code text not null default 'UNASSIGNED';

alter table public.user_accounts drop constraint if exists user_accounts_package_code_fkey;
alter table public.user_accounts
  add constraint user_accounts_package_code_fkey
  foreign key (package_code) references public.identity_package_catalog(code);

create index if not exists user_accounts_identity_family_idx
  on public.user_accounts(identity_product_family);
create index if not exists user_accounts_package_code_idx
  on public.user_accounts(package_code);

comment on column public.user_accounts.account_type is
  'Login occupancy overlay: INDIVIDUAL, CORPORATE, or TEST. Not a product family.';
comment on column public.user_accounts.identity_product_family is
  'Primary identity product family for this user (Digital ID, Pet ID, …).';
comment on column public.user_accounts.package_code is
  'Primary commercial package that determines occupancy and family. UNASSIGNED until purchase or org provision.';

create table if not exists public.user_identity_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_accounts(id) on delete cascade,
  product_family public.identity_product_family not null,
  occupancy text not null check (occupancy in ('INDIVIDUAL', 'CORPORATE')),
  package_code text not null references public.identity_package_catalog(code),
  entitlement_id uuid references public.entitlements(id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_family, occupancy)
);

create index if not exists user_identity_types_user_idx
  on public.user_identity_types(user_id);
create index if not exists user_identity_types_family_idx
  on public.user_identity_types(product_family);

comment on table public.user_identity_types is
  'All identity triples a user holds. Digital ID and Pet ID can coexist.';

alter table public.identity_package_catalog enable row level security;
alter table public.user_identity_types enable row level security;

drop policy if exists "Public can read identity package catalog" on public.identity_package_catalog;
create policy "Public can read identity package catalog"
  on public.identity_package_catalog for select
  using (true);

drop policy if exists "Users can read own identity types" on public.user_identity_types;
create policy "Users can read own identity types"
  on public.user_identity_types for select to authenticated
  using (auth.uid() = user_id);

create or replace function public.identity_family_from_product_kind(p_kind public.product_kind)
returns public.identity_product_family
language sql
immutable
as $$
  select case p_kind
    when 'BUSINESS_CARD' then 'DIGITAL_ID'::public.identity_product_family
    when 'NFC_PHYSICAL_CARD' then 'DIGITAL_ID'::public.identity_product_family
    when 'HEALTH_CARD' then 'EMERGENCY_ID'::public.identity_product_family
    when 'PET_ID' then 'PET_ID'::public.identity_product_family
    when 'VEHICLE_ID' then 'VEHICLE_ID'::public.identity_product_family
    else 'DIGITAL_ID'::public.identity_product_family
  end;
$$;

create or replace function public.canonical_identity_package_code(p_code text)
returns text
language sql
stable
as $$
  select case
    when p_code is null or btrim(p_code) = '' then 'UNASSIGNED'
    when p_code = 'STARTER' then 'CORP-10'
    when p_code = 'GROWTH' then 'CORP-25'
    when p_code = 'BUSINESS' then 'CORP-50'
    when exists (select 1 from public.identity_package_catalog c where c.code = p_code) then p_code
    else 'UNASSIGNED'
  end;
$$;

create or replace function public.refresh_user_identity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.user_accounts%rowtype;
  v_plan_code text;
  v_package text := 'UNASSIGNED';
  v_family public.identity_product_family := 'DIGITAL_ID';
  v_occupancy text := 'INDIVIDUAL';
  v_entitlement record;
begin
  if p_user_id is null then
    return;
  end if;

  select * into v_account from public.user_accounts where id = p_user_id;
  if not found then
    return;
  end if;

  delete from public.user_identity_types where user_id = p_user_id;

  for v_entitlement in
    select e.id, e.kind, e.package_code
    from public.entitlements e
    where e.user_id = p_user_id
      and e.status = 'ACTIVE'
  loop
    v_family := public.identity_family_from_product_kind(v_entitlement.kind);
    v_package := public.canonical_identity_package_code(v_entitlement.package_code);
    if v_package = 'UNASSIGNED' then
      if v_family = 'DIGITAL_ID' then
        continue;
      end if;
      v_package := v_family::text;
    end if;
    select occupancy into v_occupancy from public.identity_package_catalog where code = v_package;
    insert into public.user_identity_types (
      user_id, product_family, occupancy, package_code, entitlement_id, status, updated_at
    ) values (
      p_user_id, v_family, coalesce(v_occupancy, 'INDIVIDUAL'), v_package, v_entitlement.id, 'ACTIVE', now()
    )
    on conflict (user_id, product_family, occupancy) do update set
      package_code = excluded.package_code,
      entitlement_id = excluded.entitlement_id,
      status = 'ACTIVE',
      updated_at = now();
  end loop;

  select public.canonical_identity_package_code(bp.code)
  into v_plan_code
  from public.organization_members om
  join public.organization_subscriptions sub
    on sub.organization_id = om.organization_id
   and sub.status in ('ACTIVE', 'GRACE_PERIOD')
  join public.business_plans bp on bp.id = sub.plan_id
  where om.user_id = p_user_id
    and om.status = 'ACTIVE'
  order by sub.expires_at desc nulls last
  limit 1;

  if v_plan_code is not null and v_plan_code <> 'UNASSIGNED' then
    select occupancy, product_family into v_occupancy, v_family
    from public.identity_package_catalog
    where code = v_plan_code;
    insert into public.user_identity_types (
      user_id, product_family, occupancy, package_code, status, updated_at
    ) values (
      p_user_id,
      coalesce(v_family, 'DIGITAL_ID'),
      coalesce(v_occupancy, 'CORPORATE'),
      v_plan_code,
      'ACTIVE',
      now()
    )
    on conflict (user_id, product_family, occupancy) do update set
      package_code = excluded.package_code,
      status = 'ACTIVE',
      updated_at = now();
  end if;

  if v_plan_code is not null and v_plan_code <> 'UNASSIGNED' then
    v_package := v_plan_code;
    v_family := coalesce(v_family, 'DIGITAL_ID');
  else
    select uit.package_code, uit.product_family
    into v_package, v_family
    from public.user_identity_types uit
    where uit.user_id = p_user_id and uit.status = 'ACTIVE'
    order by uit.updated_at desc
    limit 1;
    v_package := coalesce(v_package, 'UNASSIGNED');
    v_family := coalesce(v_family, 'DIGITAL_ID');
  end if;

  update public.user_accounts
  set identity_product_family = v_family,
      package_code = v_package,
      updated_at = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.refresh_user_identity(uuid) from public;
grant execute on function public.refresh_user_identity(uuid) to service_role;

create or replace function public.sync_user_identity_from_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.user_id is not null then
      perform public.refresh_user_identity(old.user_id);
    end if;
    return old;
  end if;
  if new.user_id is not null then
    perform public.refresh_user_identity(new.user_id);
  end if;
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id and old.user_id is not null then
    perform public.refresh_user_identity(old.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists entitlements_refresh_user_identity on public.entitlements;
create trigger entitlements_refresh_user_identity
after insert or delete or update of user_id, status, kind, package_code
on public.entitlements
for each row execute function public.sync_user_identity_from_entitlement();

create or replace function public.sync_organization_member_account_type()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and new.status = 'ACTIVE' then
    update public.user_accounts
    set account_type = 'CORPORATE', updated_at = now()
    where id = new.user_id and account_type <> 'TEST';
  end if;
  if new.user_id is not null then
    perform public.refresh_user_identity(new.user_id);
  end if;
  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id and old.user_id is not null then
    perform public.refresh_user_identity(old.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.sync_user_identity_from_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
begin
  for v_member in
    select user_id from public.organization_members
    where organization_id = new.organization_id and user_id is not null
  loop
    perform public.refresh_user_identity(v_member.user_id);
  end loop;
  return new;
end;
$$;

drop trigger if exists organization_subscription_refresh_user_identity on public.organization_subscriptions;
create trigger organization_subscription_refresh_user_identity
after insert or update of plan_id, status
on public.organization_subscriptions
for each row execute function public.sync_user_identity_from_subscription();

-- Backfill from current entitlements and org memberships.
do $$
declare
  v_user uuid;
begin
  for v_user in select id from public.user_accounts
  loop
    perform public.refresh_user_identity(v_user);
  end loop;
end $$;
