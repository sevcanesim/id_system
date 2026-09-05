-- Super Admin grants are operational allocations, not zero-value sales. They
-- never create a customer order, invoice or payment attempt.

create table if not exists public.admin_access_grants (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('INDIVIDUAL', 'ORGANIZATION')),
  user_id uuid references public.user_accounts(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  package_code text not null references public.identity_package_catalog(code),
  grant_reason text not null check (grant_reason in ('ADVERTISING', 'COMPLIMENTARY', 'SUPPORT')),
  term_mode text not null check (term_mode in ('PERPETUAL', 'FIXED_TERM')),
  renewal_policy text not null check (renewal_policy in ('NONE', 'PAID_RENEWAL', 'MANUAL_RENEWAL')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED', 'EXPIRED')),
  network_mail_limit integer not null default 0 check (network_mail_limit >= 0),
  network_mail_remaining integer not null default 0 check (network_mail_remaining >= 0 and network_mail_remaining <= network_mail_limit),
  notes text,
  created_by uuid not null references public.user_accounts(id),
  revoked_at timestamptz,
  revoked_by uuid references public.user_accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'INDIVIDUAL' and user_id is not null and organization_id is null) or (scope = 'ORGANIZATION' and organization_id is not null and user_id is null)),
  check ((term_mode = 'PERPETUAL' and expires_at is null) or (term_mode = 'FIXED_TERM' and expires_at is not null))
);

create unique index if not exists admin_access_grants_one_active_individual_package
  on public.admin_access_grants(user_id, package_code)
  where scope = 'INDIVIDUAL' and status = 'ACTIVE';
create index if not exists admin_access_grants_support_lookup_idx
  on public.admin_access_grants(user_id, status, expires_at desc);

alter table public.admin_access_grants enable row level security;

create table if not exists public.system_error_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text,
  source text not null,
  error_code text,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  user_id uuid references public.user_accounts(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index if not exists system_error_logs_support_lookup_idx
  on public.system_error_logs(user_id, occurred_at desc);
alter table public.system_error_logs enable row level security;

create or replace function public.admin_grant_individual_premium(
  p_actor_user_id uuid,
  p_yenomi_id text,
  p_grant_reason text,
  p_term_mode text,
  p_renewal_policy text,
  p_expires_at timestamptz,
  p_network_mail_limit integer default 0,
  p_notes text default null
) returns jsonb
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_user_id uuid; v_grant public.admin_access_grants%rowtype;
begin
  if not exists (select 1 from public.admin_users where user_id = p_actor_user_id) then
    return jsonb_build_object('ok', false, 'code', 'ADMIN_REQUIRED');
  end if;
  select id into v_user_id from public.user_accounts where yenomi_id = trim(p_yenomi_id) and status = 'ACTIVE';
  if v_user_id is null then return jsonb_build_object('ok', false, 'code', 'USER_NOT_FOUND'); end if;
  if p_grant_reason not in ('ADVERTISING', 'COMPLIMENTARY', 'SUPPORT')
     or p_term_mode not in ('PERPETUAL', 'FIXED_TERM')
     or p_renewal_policy not in ('NONE', 'PAID_RENEWAL', 'MANUAL_RENEWAL')
     or coalesce(p_network_mail_limit, 0) < 0
     or (p_term_mode = 'PERPETUAL' and p_expires_at is not null)
     or (p_term_mode = 'FIXED_TERM' and (p_expires_at is null or p_expires_at <= now())) then
    return jsonb_build_object('ok', false, 'code', 'INVALID_GRANT');
  end if;
  update public.admin_access_grants set status='REVOKED', revoked_at=now(), revoked_by=p_actor_user_id, updated_at=now()
    where user_id=v_user_id and package_code='INDIVIDUAL_PREMIUM' and scope='INDIVIDUAL' and status='ACTIVE';
  insert into public.admin_access_grants(scope,user_id,package_code,grant_reason,term_mode,renewal_policy,expires_at,network_mail_limit,network_mail_remaining,notes,created_by)
  values ('INDIVIDUAL',v_user_id,'INDIVIDUAL_PREMIUM',p_grant_reason,p_term_mode,p_renewal_policy,p_expires_at,coalesce(p_network_mail_limit,0),coalesce(p_network_mail_limit,0),nullif(trim(coalesce(p_notes,'')),''),p_actor_user_id)
  returning * into v_grant;
  insert into public.admin_audit_log(actor_user_id,action,target_table,target_id,after_value)
  values (p_actor_user_id,'INDIVIDUAL_PREMIUM_GRANTED','admin_access_grants',v_grant.id::text,to_jsonb(v_grant));
  return jsonb_build_object('ok', true, 'grant', to_jsonb(v_grant));
end;
$$;

revoke all on function public.admin_grant_individual_premium(uuid,text,text,text,text,timestamptz,integer,text) from public, anon, authenticated;
grant execute on function public.admin_grant_individual_premium(uuid,text,text,text,text,timestamptz,integer,text) to service_role;

-- Legal identity remains locked for ordinary account users. A separately
-- audited security-definer function is the single Super Admin exception.
create or replace function public.prevent_organization_legal_identity_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('app.yenomi_admin_legal_update', true) = 'on' then return new; end if;
  if old.corporate_id is distinct from new.corporate_id
    or old.name is distinct from new.name or old.legal_name is distinct from new.legal_name
    or old.tax_id_type is distinct from new.tax_id_type or old.tax_number is distinct from new.tax_number
    or old.tax_office is distinct from new.tax_office or old.mersis_number is distinct from new.mersis_number
    or old.trade_registry_number is distinct from new.trade_registry_number
    or old.billing_address is distinct from new.billing_address or old.billing_city is distinct from new.billing_city
    or old.billing_district is distinct from new.billing_district or old.billing_postal_code is distinct from new.billing_postal_code
    or old.billing_country_code is distinct from new.billing_country_code or old.billing_email is distinct from new.billing_email
    or old.billing_phone is distinct from new.billing_phone or old.authorized_person_name is distinct from new.authorized_person_name then
    raise exception using errcode='42501', message='Resmî şirket bilgileri değiştirilemez.';
  end if;
  return new;
end;
$$;

create or replace function public.admin_update_organization_legal_identity(
  p_actor_user_id uuid, p_organization_id uuid, p_tax_number text, p_tax_office text,
  p_legal_name text, p_billing_address text, p_billing_city text, p_billing_phone text, p_billing_email text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_before jsonb; v_after jsonb;
begin
  if not exists (select 1 from public.admin_users where user_id=p_actor_user_id) then return jsonb_build_object('ok',false,'code','ADMIN_REQUIRED'); end if;
  select to_jsonb(o) into v_before from public.organizations o where o.id=p_organization_id for update;
  if v_before is null then return jsonb_build_object('ok',false,'code','ORGANIZATION_NOT_FOUND'); end if;
  perform set_config('app.yenomi_admin_legal_update','on',true);
  update public.organizations set
    tax_number=nullif(regexp_replace(coalesce(p_tax_number,''),'\\D','','g'),''),
    tax_office=nullif(regexp_replace(trim(coalesce(p_tax_office,'')),'\\s+',' ','g'),''),
    legal_name=nullif(regexp_replace(trim(coalesce(p_legal_name,'')),'\\s+',' ','g'),''),
    billing_address=nullif(trim(coalesce(p_billing_address,'')),''),
    billing_city=nullif(trim(coalesce(p_billing_city,'')),''),
    billing_phone=nullif(trim(coalesce(p_billing_phone,'')),''),
    billing_email=nullif(lower(trim(coalesce(p_billing_email,''))),''), updated_at=now()
  where id=p_organization_id;
  select to_jsonb(o) into v_after from public.organizations o where o.id=p_organization_id;
  insert into public.admin_audit_log(actor_user_id,action,target_table,target_id,before_value,after_value)
  values(p_actor_user_id,'ORGANIZATION_LEGAL_IDENTITY_UPDATED','organizations',p_organization_id::text,v_before,v_after);
  return jsonb_build_object('ok',true,'organization',v_after);
end;
$$;
revoke all on function public.admin_update_organization_legal_identity(uuid,uuid,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_update_organization_legal_identity(uuid,uuid,text,text,text,text,text,text,text) to service_role;

-- A support operator may correct the application-facing display name or
-- suspend/reactivate an account, but never mutates the immutable Yenomi ID
-- or the Auth-managed e-mail address. Keep this path audited like legal data.
create or replace function public.admin_update_user_account(
  p_actor_user_id uuid,
  p_yenomi_id text,
  p_display_name text,
  p_status text
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_before jsonb; v_after jsonb; v_user_id uuid;
begin
  if not exists (select 1 from public.admin_users where user_id=p_actor_user_id) then
    return jsonb_build_object('ok',false,'code','ADMIN_REQUIRED');
  end if;
  select ua.id,to_jsonb(ua) into v_user_id,v_before
    from public.user_accounts ua where ua.yenomi_id=trim(p_yenomi_id) for update;
  if v_user_id is null then return jsonb_build_object('ok',false,'code','USER_NOT_FOUND'); end if;
  if p_status not in ('ACTIVE','SUSPENDED') then return jsonb_build_object('ok',false,'code','INVALID_STATUS'); end if;
  update public.user_accounts set
    display_name=nullif(regexp_replace(trim(coalesce(p_display_name,'')),'\\s+',' ','g'),''),
    status=p_status,
    updated_at=now()
  where id=v_user_id;
  select to_jsonb(ua) into v_after from public.user_accounts ua where ua.id=v_user_id;
  insert into public.admin_audit_log(actor_user_id,action,target_table,target_id,before_value,after_value)
  values(p_actor_user_id,'USER_ACCOUNT_UPDATED','user_accounts',v_user_id::text,v_before,v_after);
  return jsonb_build_object('ok',true,'account',v_after);
end;
$$;
revoke all on function public.admin_update_user_account(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.admin_update_user_account(uuid,text,text,text) to service_role;
