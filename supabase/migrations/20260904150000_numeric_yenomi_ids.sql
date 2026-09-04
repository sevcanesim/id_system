-- The permanent 12-digit Yenomi ID has a readable structure:
--   YYMMDD PP SSSS
--     date  package  daily package sequence
-- IDs remain text so leading zeroes are never lost.

create table if not exists public.yenomi_id_package_codes (
  package_code text primary key,
  numeric_code text not null unique check (numeric_code ~ '^[0-9]{2}$')
);

insert into public.yenomi_id_package_codes (package_code, numeric_code) values
  ('UNASSIGNED', '19'),
  ('INDIVIDUAL', '10'),
  ('INDIVIDUAL_DIGITAL', '11'),
  ('INDIVIDUAL_PREMIUM', '12'),
  ('CORP-2', '20'),
  ('CORP-3', '21'),
  ('CORP-4', '22'),
  ('CORP-5', '23'),
  ('CORP-10', '24'),
  ('CORP-20', '25'),
  ('CORP-25', '26'),
  ('CORP-50', '27'),
  ('CORP-75', '28'),
  ('CORP-100', '29'),
  ('STARTER', '30'),
  ('GROWTH', '31'),
  ('BUSINESS', '32'),
  ('ENTERPRISE', '33'),
  ('PET_ID', '40'),
  ('EMERGENCY_ID', '41'),
  ('VEHICLE_ID', '42'),
  ('BUSINESS_MINI_SITE', '43'),
  ('RESTAURANT', '44'),
  ('DEMO-2', '90'),
  ('DEMO-5', '91'),
  ('DEMO-10', '92'),
  ('DEMO-50', '93')
on conflict (package_code) do update set numeric_code = excluded.numeric_code;

create table if not exists public.yenomi_id_daily_counters (
  issued_on date not null,
  package_numeric_code text not null check (package_numeric_code ~ '^[0-9]{2}$'),
  last_sequence integer not null default 0 check (last_sequence between 0 and 9999),
  primary key (issued_on, package_numeric_code)
);

create or replace function public.allocate_yenomi_numeric_id(
  p_registered_at timestamptz,
  p_package_code text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_issued_on date := (coalesce(p_registered_at, now()) at time zone 'Europe/Istanbul')::date;
  v_package_code text;
  v_sequence integer;
begin
  select numeric_code into v_package_code
  from public.yenomi_id_package_codes
  where package_code = upper(coalesce(nullif(trim(p_package_code), ''), 'UNASSIGNED'));

  v_package_code := coalesce(v_package_code, '99');

  insert into public.yenomi_id_daily_counters (issued_on, package_numeric_code, last_sequence)
  values (v_issued_on, v_package_code, 1)
  on conflict (issued_on, package_numeric_code) do update
    set last_sequence = public.yenomi_id_daily_counters.last_sequence + 1
    where public.yenomi_id_daily_counters.last_sequence < 9999
  returning last_sequence into v_sequence;

  if v_sequence is null then
    raise exception using
      errcode = '22003',
      message = 'Bu paket için günlük Yenomi ID kapasitesi doldu.';
  end if;

  return to_char(v_issued_on, 'YYMMDD') || v_package_code || lpad(v_sequence::text, 4, '0');
end;
$$;

-- Backfill in original registration order so SSSS reflects the sequence of
-- registrations for the relevant date and package.
alter table public.organizations disable trigger organizations_legal_identity_immutable;
do $$
declare
  v_organization record;
begin
  for v_organization in
    select o.id, o.created_at, coalesce((
      select bp.code
      from public.organization_subscriptions os
      join public.business_plans bp on bp.id = os.plan_id
      where os.organization_id = o.id
      order by os.starts_at asc nulls last, os.created_at asc, os.id asc
      limit 1
    ), 'UNASSIGNED') as package_code
    from public.organizations o
    order by o.created_at asc, o.id asc
  loop
    update public.organizations
    set corporate_id = public.allocate_yenomi_numeric_id(v_organization.created_at, v_organization.package_code)
    where id = v_organization.id;
  end loop;
end;
$$;
alter table public.organizations enable trigger organizations_legal_identity_immutable;

alter table public.user_accounts disable trigger user_accounts_yenomi_id_immutable;
do $$
declare
  v_account record;
begin
  for v_account in
    select id, created_at, package_code
    from public.user_accounts
    order by created_at asc, id asc
  loop
    update public.user_accounts
    set yenomi_id = public.allocate_yenomi_numeric_id(v_account.created_at, v_account.package_code)
    where id = v_account.id;
  end loop;
end;
$$;
alter table public.user_accounts enable trigger user_accounts_yenomi_id_immutable;

-- Compatibility overloads keep direct service-role callers safe. Provisioning
-- uses the package-aware two-argument allocator below.
create or replace function public.allocate_yenomi_numeric_id()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.allocate_yenomi_numeric_id(now(), 'UNASSIGNED');
end;
$$;

create or replace function public.allocate_corporate_id()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.allocate_yenomi_numeric_id(now(), 'UNASSIGNED');
end;
$$;

create or replace function public.allocate_user_yenomi_id()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return public.allocate_yenomi_numeric_id(now(), 'INDIVIDUAL');
end;
$$;

create or replace function public.create_organization_tenant(
  p_actor_user_id uuid,
  p_name text,
  p_slug text,
  p_tax_number text,
  p_tax_office text,
  p_legal_address text,
  p_city text,
  p_district text,
  p_country text,
  p_employee_limit integer,
  p_digital_card_limit integer,
  p_physical_card_limit integer,
  p_mail_credit_limit integer,
  p_storage_bytes bigint,
  p_status text,
  p_plan_code text,
  p_billing_period text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.business_plans%rowtype;
  v_organization public.organizations%rowtype;
  v_subscription public.organization_subscriptions%rowtype;
  v_status text := coalesce(nullif(trim(p_status), ''), 'ACTIVE');
  v_mail_limit integer;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_tax_number), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;
  if v_status not in ('ACTIVE', 'SUSPENDED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATUS');
  end if;
  if p_employee_limit is null or p_employee_limit <= 0 then
    return jsonb_build_object('ok', false, 'code', 'SEAT_LIMIT_REQUIRED');
  end if;
  if exists (select 1 from public.organizations where tax_number = trim(p_tax_number)) then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_TAX_NUMBER');
  end if;

  select * into v_plan from public.business_plans where code = p_plan_code and is_active = true;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'PLAN_NOT_FOUND');
  end if;

  v_mail_limit := coalesce(p_mail_credit_limit, public.network_mail_grant(p_employee_limit));

  insert into public.organizations (
    name, slug, status, corporate_id, tax_number, tax_office, legal_address, city, district, country, created_by
  ) values (
    trim(p_name),
    trim(p_slug),
    v_status,
    public.allocate_yenomi_numeric_id(now(), p_plan_code),
    trim(p_tax_number),
    nullif(trim(p_tax_office), ''),
    nullif(trim(p_legal_address), ''),
    nullif(trim(p_city), ''),
    nullif(trim(p_district), ''),
    coalesce(nullif(trim(p_country), ''), 'Türkiye'),
    p_actor_user_id
  ) returning * into v_organization;

  insert into public.organization_subscriptions (organization_id, plan_id, status, starts_at, expires_at, seat_limit, billing_period)
  values (v_organization.id, v_plan.id, 'ACTIVE', now(), p_expires_at, p_employee_limit, coalesce(nullif(trim(p_billing_period), ''), 'YEARLY'))
  returning * into v_subscription;

  insert into public.organization_entitlements (
    organization_id, employee_limit, digital_card_limit, physical_card_limit, mail_credit_limit, mail_credits_remaining, storage_bytes
  ) values (
    v_organization.id,
    p_employee_limit,
    coalesce(p_digital_card_limit, p_employee_limit),
    coalesce(p_physical_card_limit, p_employee_limit),
    v_mail_limit,
    v_mail_limit,
    coalesce(p_storage_bytes, 10737418240::bigint)
  );

  insert into public.admin_audit_log (actor_user_id, action, target_table, target_id, before_value, after_value)
  values (
    p_actor_user_id,
    'ORGANIZATION_TENANT_CREATED',
    'organizations',
    v_organization.id::text,
    null,
    jsonb_build_object('corporate_id', v_organization.corporate_id, 'tax_number', v_organization.tax_number, 'employee_limit', p_employee_limit, 'mail_credit_limit', v_mail_limit)
  );

  return jsonb_build_object('ok', true, 'organization', to_jsonb(v_organization), 'subscription', to_jsonb(v_subscription));
exception
  when unique_violation then
    if sqlerrm ilike '%tax_number%' then
      return jsonb_build_object('ok', false, 'code', 'DUPLICATE_TAX_NUMBER');
    end if;
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_SLUG_OR_MEMBER');
end;
$$;

do $$ begin
  alter table public.organizations
    add constraint organizations_corporate_id_numeric_check
    check (corporate_id ~ '^[0-9]{12}$');
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.user_accounts
    add constraint user_accounts_yenomi_id_numeric_check
    check (yenomi_id ~ '^[0-9]{12}$');
exception when duplicate_object then null;
end $$;

revoke all on function public.allocate_yenomi_numeric_id(timestamptz, text) from public, anon, authenticated;
grant execute on function public.allocate_yenomi_numeric_id(timestamptz, text) to service_role;
revoke all on function public.allocate_yenomi_numeric_id() from public, anon, authenticated;
grant execute on function public.allocate_yenomi_numeric_id() to service_role;
revoke all on function public.allocate_corporate_id() from public, anon, authenticated;
grant execute on function public.allocate_corporate_id() to service_role;
revoke all on function public.allocate_user_yenomi_id() from public, anon, authenticated;
grant execute on function public.allocate_user_yenomi_id() to service_role;

comment on column public.organizations.corporate_id is
  'Permanent 12-digit Yenomi ID: YYMMDD + package code + daily sequence. Visible only to OWNER and HR via the application API.';
comment on column public.user_accounts.yenomi_id is
  'Permanent 12-digit Yenomi ID: YYMMDD + package code + daily sequence. Users may read only their own value via RLS.';
