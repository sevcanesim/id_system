-- Tenant identity, networking CRM, locale content, event attribution, slug redirects.
-- Applied from the parked product note: company ≠ membership, QR = /p/{publicId},
-- share = /p/{slug}, event = /e/{eventPublicId}, leads are not public.corporate_leads.

create sequence if not exists public.organization_corporate_id_seq;

alter table public.organizations
  add column if not exists corporate_id text,
  add column if not exists tax_number text,
  add column if not exists tax_office text,
  add column if not exists legal_address text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists country text default 'Türkiye',
  add column if not exists created_by uuid,
  add column if not exists international_networking boolean not null default false;

update public.organizations
set corporate_id = 'YEN-CORP-' || lpad(nextval('public.organization_corporate_id_seq')::text, 6, '0')
where corporate_id is null or btrim(corporate_id) = '';

alter table public.organizations
  alter column corporate_id set not null;

create unique index if not exists organizations_corporate_id_uidx on public.organizations (corporate_id);
create unique index if not exists organizations_tax_number_uidx on public.organizations (tax_number) where tax_number is not null and btrim(tax_number) <> '';

create table if not exists public.organization_entitlements (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  employee_limit integer not null check (employee_limit > 0),
  digital_card_limit integer not null default 0 check (digital_card_limit >= 0),
  physical_card_limit integer not null default 0 check (physical_card_limit >= 0),
  mail_credit_limit integer not null default 0 check (mail_credit_limit >= 0),
  mail_credits_remaining integer not null default 0 check (mail_credits_remaining >= 0),
  storage_bytes bigint not null default 0 check (storage_bytes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organization_entitlements (organization_id, employee_limit, digital_card_limit, physical_card_limit, mail_credit_limit, mail_credits_remaining, storage_bytes)
select o.id,
  coalesce(s.seat_limit, 1),
  coalesce(s.seat_limit, 1),
  greatest(1, coalesce(s.seat_limit, 1) / 2),
  1000,
  1000,
  10737418240::bigint
from public.organizations o
left join lateral (
  select seat_limit from public.organization_subscriptions
  where organization_id = o.id and status in ('ACTIVE', 'GRACE_PERIOD')
  order by created_at desc
  limit 1
) s on true
on conflict (organization_id) do nothing;

alter table public.organization_entitlements enable row level security;
drop policy if exists "Members can read entitlements" on public.organization_entitlements;
create policy "Members can read entitlements" on public.organization_entitlements for select to authenticated using (
  public.is_active_organization_member(organization_id)
);

create table if not exists public.card_profile_slug_redirects (
  old_slug text primary key,
  profile_id uuid not null references public.card_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists card_profile_slug_redirects_profile_idx on public.card_profile_slug_redirects (profile_id);
alter table public.card_profile_slug_redirects enable row level security;
drop policy if exists "Public can resolve slug redirects" on public.card_profile_slug_redirects;
create policy "Public can resolve slug redirects" on public.card_profile_slug_redirects for select using (true);
drop policy if exists "Owners can write slug redirects" on public.card_profile_slug_redirects;
create policy "Owners can write slug redirects" on public.card_profile_slug_redirects for insert to authenticated with check (
  exists (select 1 from public.card_profiles p where p.id = profile_id and p.user_id = auth.uid())
);

create table if not exists public.card_profile_locales (
  profile_id uuid not null references public.card_profiles(id) on delete cascade,
  locale text not null check (locale in ('tr', 'en')),
  role text,
  about text,
  company_summary text,
  meeting_cta text,
  updated_at timestamptz not null default now(),
  primary key (profile_id, locale)
);

alter table public.card_profile_locales enable row level security;
drop policy if exists "Public can read published locales" on public.card_profile_locales;
create policy "Public can read published locales" on public.card_profile_locales for select using (
  exists (
    select 1 from public.card_profiles p
    where p.id = profile_id and p.is_published = true and p.card_status = 'ACTIVE'
  )
);
drop policy if exists "Owners can write locales" on public.card_profile_locales;
create policy "Owners can write locales" on public.card_profile_locales for all to authenticated using (
  exists (select 1 from public.card_profiles p where p.id = profile_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from public.card_profiles p where p.id = profile_id and p.user_id = auth.uid())
);

create table if not exists public.networking_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  public_id text not null unique,
  name text not null,
  location text,
  booth text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.networking_event_links (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.networking_events(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.card_profiles(id) on delete cascade,
  public_id text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.networking_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.card_profiles(id) on delete cascade,
  visitor_id text not null,
  event_id uuid references public.networking_events(id) on delete set null,
  event_link_id uuid references public.networking_event_links(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  company text,
  position text,
  industry text,
  city text,
  country text,
  locale text not null default 'tr' check (locale in ('tr', 'en')),
  interests text[] not null default '{}',
  intent text,
  introduction text,
  source text not null default 'QR' check (source in ('QR', 'NFC', 'EVENT', 'SHARE')),
  status text not null default 'NEW',
  score integer not null default 0,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.networking_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.networking_leads(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.networking_meetings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.networking_leads(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.card_profiles(id) on delete cascade,
  meeting_type text not null check (meeting_type in ('ONLINE', 'IN_PERSON')),
  preferred_at timestamptz,
  timezone text,
  message text,
  planning_required boolean not null default false,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'ACCEPTED', 'ALTERNATIVE', 'DECLINED', 'COMPLETED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists networking_leads_org_idx on public.networking_leads (organization_id, created_at desc);
create index if not exists networking_leads_profile_idx on public.networking_leads (profile_id, created_at desc);
create index if not exists networking_lead_events_lead_idx on public.networking_lead_events (lead_id, created_at);
create index if not exists networking_meetings_org_idx on public.networking_meetings (organization_id, created_at desc);
create index if not exists networking_event_links_profile_idx on public.networking_event_links (profile_id);

alter table public.networking_events enable row level security;
alter table public.networking_event_links enable row level security;
alter table public.networking_leads enable row level security;
alter table public.networking_lead_events enable row level security;
alter table public.networking_meetings enable row level security;

drop policy if exists "Managers read networking events" on public.networking_events;
create policy "Managers read networking events" on public.networking_events for select to authenticated using (
  public.is_active_organization_member(organization_id, array['OWNER', 'ADMIN'])
);
drop policy if exists "Managers write networking events" on public.networking_events;
create policy "Managers write networking events" on public.networking_events for all to authenticated using (
  public.is_active_organization_member(organization_id, array['OWNER', 'ADMIN'])
) with check (
  public.is_active_organization_member(organization_id, array['OWNER', 'ADMIN'])
);

drop policy if exists "Managers read event links" on public.networking_event_links;
create policy "Managers read event links" on public.networking_event_links for select to authenticated using (
  public.is_active_organization_member(organization_id, array['OWNER', 'ADMIN'])
);
drop policy if exists "Public can resolve event links" on public.networking_event_links;
create policy "Public can resolve event links" on public.networking_event_links for select using (true);

drop policy if exists "Managers read leads" on public.networking_leads;
create policy "Managers read leads" on public.networking_leads for select to authenticated using (
  organization_id is not null and public.is_active_organization_member(organization_id, array['OWNER', 'ADMIN'])
);
drop policy if exists "Managers write leads" on public.networking_leads;
create policy "Managers write leads" on public.networking_leads for update to authenticated using (
  organization_id is not null and public.is_active_organization_member(organization_id, array['OWNER', 'ADMIN'])
);

drop policy if exists "Managers read lead events" on public.networking_lead_events;
create policy "Managers read lead events" on public.networking_lead_events for select to authenticated using (
  exists (
    select 1 from public.networking_leads l
    where l.id = lead_id
      and l.organization_id is not null
      and public.is_active_organization_member(l.organization_id, array['OWNER', 'ADMIN'])
  )
);

drop policy if exists "Managers read meetings" on public.networking_meetings;
create policy "Managers read meetings" on public.networking_meetings for select to authenticated using (
  organization_id is not null and public.is_active_organization_member(organization_id, array['OWNER', 'ADMIN'])
);
drop policy if exists "Managers write meetings" on public.networking_meetings;
create policy "Managers write meetings" on public.networking_meetings for update to authenticated using (
  organization_id is not null and public.is_active_organization_member(organization_id, array['OWNER', 'ADMIN'])
);

create or replace function public.allocate_corporate_id()
returns text
language plpgsql
as $$
begin
  return 'YEN-CORP-' || lpad(nextval('public.organization_corporate_id_seq')::text, 6, '0');
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

  insert into public.organizations (
    name, slug, status, corporate_id, tax_number, tax_office, legal_address, city, district, country, created_by
  ) values (
    trim(p_name),
    trim(p_slug),
    v_status,
    public.allocate_corporate_id(),
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
    coalesce(p_mail_credit_limit, 1000),
    coalesce(p_mail_credit_limit, 1000),
    coalesce(p_storage_bytes, 10737418240::bigint)
  );

  insert into public.admin_audit_log (actor_user_id, action, target_table, target_id, before_value, after_value)
  values (
    p_actor_user_id,
    'ORGANIZATION_TENANT_CREATED',
    'organizations',
    v_organization.id::text,
    null,
    jsonb_build_object('corporate_id', v_organization.corporate_id, 'tax_number', v_organization.tax_number, 'employee_limit', p_employee_limit)
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

create or replace function public.attach_organization_manager(
  p_actor_user_id uuid,
  p_organization_id uuid,
  p_email text,
  p_full_name text,
  p_role text,
  p_token_hash text,
  p_invite_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_member public.organization_members%rowtype;
  v_existing uuid;
  v_role text := upper(trim(p_role));
  v_user_id uuid;
begin
  if v_role not in ('OWNER', 'ADMIN', 'HR') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ROLE');
  end if;

  select id into v_existing from public.organization_members
  where organization_id = p_organization_id and lower(email) = lower(trim(p_email));
  if found then
    return jsonb_build_object('ok', false, 'code', 'MEMBER_EXISTS');
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;

  insert into public.organization_members (organization_id, email, full_name, role, status, user_id)
  values (
    p_organization_id,
    lower(trim(p_email)),
    nullif(p_full_name, ''),
    v_role,
    case when v_user_id is null then 'INVITED' else 'ACTIVE' end,
    v_user_id
  )
  returning * into v_member;

  if v_member.status = 'INVITED' then
    insert into public.organization_invites (organization_id, member_id, token_hash, expires_at, last_sent_at, invited_by_user_id)
    values (p_organization_id, v_member.id, p_token_hash, p_invite_expires_at, now(), p_actor_user_id);
  end if;

  insert into public.admin_audit_log (actor_user_id, action, target_table, target_id, after_value)
  values (
    p_actor_user_id,
    'ORGANIZATION_MANAGER_ATTACHED',
    'organization_members',
    v_member.id::text,
    jsonb_build_object('organization_id', p_organization_id, 'email', v_member.email, 'role', v_member.role)
  );

  return jsonb_build_object('ok', true, 'member', to_jsonb(v_member));
end;
$$;

revoke all on function public.create_organization_tenant(uuid,text,text,text,text,text,text,text,text,integer,integer,integer,integer,bigint,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.create_organization_tenant(uuid,text,text,text,text,text,text,text,text,integer,integer,integer,integer,bigint,text,text,text,timestamptz) to service_role;
revoke all on function public.attach_organization_manager(uuid,uuid,text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.attach_organization_manager(uuid,uuid,text,text,text,text,timestamptz) to service_role;
revoke all on function public.allocate_corporate_id() from public, anon, authenticated;
grant execute on function public.allocate_corporate_id() to service_role;

notify pgrst, 'reload schema';
