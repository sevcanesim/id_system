-- Super Admin operations model: physical-card production/shipping, quota adjustments,
-- corporate renewal notices, and runtime premium-mail catalog alignment.

-- Historical catalog migrations used 500 credits. The current commercial contract is 100.
update public.product_variants
set name = case
      when sku = 'YENOMI-NFC-PREMIUM-ANNUAL' then 'Yenomi ID Premium — NFC + 100 Network Mail'
      else name
    end,
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('network_mail_credits', 100)
where sku in ('YENOMI-NFC-PREMIUM-ANNUAL', 'YENOMI-PREMIUM-RENEWAL-ANNUAL', 'YENOMI-PREMIUM-UPGRADE');

alter table public.commerce_physical_card_units
  add column if not exists operations_status text not null default 'PROFILE_REQUIRED',
  add column if not exists carrier text,
  add column if not exists tracking_number text,
  add column if not exists print_requested_at timestamptz,
  add column if not exists print_started_at timestamptz,
  add column if not exists print_approved_at timestamptz,
  add column if not exists shipped_at timestamptz,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists delivered_at timestamptz;

do $$ begin
  alter table public.commerce_physical_card_units
    add constraint commerce_physical_card_units_operations_status_check
    check (operations_status in (
      'PROFILE_REQUIRED',
      'PRINT_PENDING',
      'PRINTING',
      'SHIPPING_PENDING',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED'
    ));
exception when duplicate_object then null;
end $$;

create index if not exists commerce_physical_card_units_operations_queue_idx
  on public.commerce_physical_card_units(operations_status, created_at);

create table if not exists public.commerce_physical_card_status_history (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.commerce_physical_card_units(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'SYSTEM' check (source in ('SYSTEM','CUSTOMER','ADMIN','CARRIER')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists commerce_physical_card_status_history_unit_created_idx
  on public.commerce_physical_card_status_history(unit_id, created_at);

alter table public.commerce_physical_card_status_history enable row level security;

drop policy if exists "Users can read own physical card status history" on public.commerce_physical_card_status_history;
create policy "Users can read own physical card status history"
on public.commerce_physical_card_status_history for select to authenticated
using (exists(
  select 1
  from public.commerce_physical_card_units unit
  join public.commerce_order_items item on item.id = unit.order_item_id
  join public.commerce_orders order_row on order_row.id = item.order_id
  where unit.id = unit_id and order_row.user_id = auth.uid()
));

create table if not exists public.network_mail_adjustment_ledger (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('INDIVIDUAL','ORGANIZATION')),
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  entitlement_id uuid references public.entitlements(id) on delete set null,
  delta integer not null,
  balance_before integer not null check (balance_before >= 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint network_mail_adjustment_scope_target check (
    (scope = 'INDIVIDUAL' and user_id is not null and organization_id is null)
    or (scope = 'ORGANIZATION' and organization_id is not null and user_id is null)
  )
);

create index if not exists network_mail_adjustment_ledger_user_idx
  on public.network_mail_adjustment_ledger(user_id, created_at desc);
create index if not exists network_mail_adjustment_ledger_org_idx
  on public.network_mail_adjustment_ledger(organization_id, created_at desc);

alter table public.network_mail_adjustment_ledger enable row level security;
revoke insert, update, delete on public.network_mail_adjustment_ledger from anon, authenticated;

drop policy if exists "Admins can read network mail adjustment ledger" on public.network_mail_adjustment_ledger;
create policy "Admins can read network mail adjustment ledger"
on public.network_mail_adjustment_ledger for select to authenticated
using (exists(select 1 from public.admin_users admin_user where admin_user.user_id = auth.uid()));

create table if not exists public.organization_capacity_renewal_notices (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.organization_capacity_terms(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  due_at timestamptz not null,
  renewal_price_kurus integer not null check (renewal_price_kurus >= 0),
  currency text not null default 'TRY' check (currency = 'TRY'),
  status text not null default 'PENDING' check (status in ('PENDING','NOTIFIED','INVOICED','PAID','CANCELLED')),
  invoice_reference text,
  notified_at timestamptz,
  invoiced_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(term_id)
);

create index if not exists organization_capacity_renewal_notices_due_idx
  on public.organization_capacity_renewal_notices(status, due_at);

alter table public.organization_capacity_renewal_notices enable row level security;
revoke insert, update, delete on public.organization_capacity_renewal_notices from anon, authenticated;

drop policy if exists "Organization members can read capacity renewal notices" on public.organization_capacity_renewal_notices;
create policy "Organization members can read capacity renewal notices"
on public.organization_capacity_renewal_notices for select to authenticated
using (exists(
  select 1 from public.organization_members member
  where member.organization_id = organization_capacity_renewal_notices.organization_id
    and member.user_id = auth.uid()
    and member.status = 'ACTIVE'
));

create or replace function public.transition_physical_card_unit(
  p_unit_id uuid,
  p_next_status text,
  p_actor_user_id uuid,
  p_source text default 'ADMIN',
  p_carrier text default null,
  p_tracking_number text default null,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_unit public.commerce_physical_card_units%rowtype;
  v_allowed boolean := false;
  v_now timestamptz := now();
begin
  if p_next_status not in ('PROFILE_REQUIRED','PRINT_PENDING','PRINTING','SHIPPING_PENDING','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','CANCELLED') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_STATUS');
  end if;
  if p_source not in ('SYSTEM','CUSTOMER','ADMIN','CARRIER') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_SOURCE');
  end if;

  select * into v_unit
  from public.commerce_physical_card_units
  where id = p_unit_id
  for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;

  v_allowed := v_unit.operations_status = p_next_status
    or (v_unit.operations_status = 'PROFILE_REQUIRED' and p_next_status = 'PRINT_PENDING')
    or (v_unit.operations_status = 'PRINT_PENDING' and p_next_status = 'PRINTING')
    or (v_unit.operations_status in ('PRINT_PENDING','PRINTING') and p_next_status = 'SHIPPING_PENDING')
    or (v_unit.operations_status = 'SHIPPING_PENDING' and p_next_status = 'IN_TRANSIT')
    or (v_unit.operations_status = 'IN_TRANSIT' and p_next_status = 'OUT_FOR_DELIVERY')
    or (v_unit.operations_status in ('IN_TRANSIT','OUT_FOR_DELIVERY') and p_next_status = 'DELIVERED')
    or (v_unit.operations_status not in ('DELIVERED','CANCELLED') and p_next_status = 'CANCELLED');

  if not v_allowed then return jsonb_build_object('ok', false, 'code', 'INVALID_TRANSITION', 'current', v_unit.operations_status); end if;
  if p_next_status = 'IN_TRANSIT' and (coalesce(trim(p_carrier),'') = '' or coalesce(trim(p_tracking_number),'') = '') then
    return jsonb_build_object('ok', false, 'code', 'TRACKING_REQUIRED');
  end if;

  update public.commerce_physical_card_units
  set operations_status = p_next_status,
      carrier = case when p_next_status = 'IN_TRANSIT' then trim(p_carrier) else carrier end,
      tracking_number = case when p_next_status = 'IN_TRANSIT' then trim(p_tracking_number) else tracking_number end,
      print_requested_at = case when p_next_status = 'PRINT_PENDING' then coalesce(print_requested_at, v_now) else print_requested_at end,
      print_started_at = case when p_next_status = 'PRINTING' then coalesce(print_started_at, v_now) else print_started_at end,
      print_approved_at = case when p_next_status = 'SHIPPING_PENDING' then coalesce(print_approved_at, v_now) else print_approved_at end,
      shipped_at = case when p_next_status = 'IN_TRANSIT' then coalesce(shipped_at, v_now) else shipped_at end,
      out_for_delivery_at = case when p_next_status = 'OUT_FOR_DELIVERY' then coalesce(out_for_delivery_at, v_now) else out_for_delivery_at end,
      delivered_at = case when p_next_status = 'DELIVERED' then coalesce(delivered_at, v_now) else delivered_at end,
      status = case
        when p_next_status in ('PROFILE_REQUIRED','PRINT_PENDING') then 'PENDING_PRODUCTION'
        when p_next_status = 'PRINTING' then 'IN_PRODUCTION'
        when p_next_status = 'SHIPPING_PENDING' then 'PRODUCED'
        when p_next_status in ('IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED') then 'SHIPPED'
        when p_next_status = 'CANCELLED' then 'CANCELLED'
        else status
      end,
      updated_at = v_now
  where id = p_unit_id;

  insert into public.commerce_physical_card_status_history(unit_id, from_status, to_status, changed_by_user_id, source, note, metadata)
  values (p_unit_id, v_unit.operations_status, p_next_status, p_actor_user_id, p_source, p_note,
    jsonb_strip_nulls(jsonb_build_object('carrier', p_carrier, 'tracking_number', p_tracking_number)));

  return jsonb_build_object('ok', true, 'from', v_unit.operations_status, 'to', p_next_status);
end;
$$;

revoke all on function public.transition_physical_card_unit(uuid,text,uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.transition_physical_card_unit(uuid,text,uuid,text,text,text,text) to service_role;

create or replace function public.admin_adjust_individual_network_mail(
  p_user_id uuid,
  p_mode text,
  p_amount integer,
  p_reason text,
  p_actor_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entitlement public.entitlements%rowtype;
  v_before integer;
  v_after integer;
  v_delta integer;
begin
  if p_mode not in ('ADD','RESET') or coalesce(trim(p_reason),'') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;
  select * into v_entitlement from public.entitlements
  where user_id = p_user_id and status = 'ACTIVE' and package_code = 'INDIVIDUAL_PREMIUM'
  order by expires_at desc nulls last limit 1 for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'PREMIUM_ENTITLEMENT_NOT_FOUND'); end if;
  v_before := greatest(coalesce(v_entitlement.network_mail_remaining,0),0);
  if p_mode = 'RESET' then v_after := greatest(coalesce(p_amount,100),0);
  else v_after := greatest(v_before + coalesce(p_amount,0),0); end if;
  v_delta := v_after - v_before;

  update public.entitlements
  set network_mail_remaining = v_after,
      network_mail_limit = greatest(coalesce(network_mail_limit,0), v_after),
      updated_at = now()
  where id = v_entitlement.id;

  insert into public.network_mail_adjustment_ledger(scope,user_id,entitlement_id,delta,balance_before,balance_after,reason,actor_user_id)
  values ('INDIVIDUAL',p_user_id,v_entitlement.id,v_delta,v_before,v_after,trim(p_reason),p_actor_user_id);

  return jsonb_build_object('ok', true, 'entitlement_id', v_entitlement.id, 'before', v_before, 'after', v_after, 'delta', v_delta);
end;
$$;

revoke all on function public.admin_adjust_individual_network_mail(uuid,text,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_adjust_individual_network_mail(uuid,text,integer,text,uuid) to service_role;

create or replace function public.admin_adjust_organization_network_mail(
  p_organization_id uuid,
  p_mode text,
  p_amount integer,
  p_reason text,
  p_actor_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before integer;
  v_after integer;
  v_delta integer;
begin
  if p_mode not in ('ADD','RESET') or coalesce(trim(p_reason),'') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT');
  end if;
  select mail_credits_remaining into v_before from public.organization_entitlements
  where organization_id = p_organization_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'ENTITLEMENT_NOT_FOUND'); end if;
  v_before := greatest(coalesce(v_before,0),0);
  if p_mode = 'RESET' then v_after := greatest(coalesce(p_amount,0),0);
  else v_after := greatest(v_before + coalesce(p_amount,0),0); end if;
  v_delta := v_after - v_before;

  update public.organization_entitlements
  set mail_credits_remaining = v_after,
      mail_credit_limit = greatest(coalesce(mail_credit_limit,0), v_after),
      updated_at = now()
  where organization_id = p_organization_id;

  insert into public.network_mail_adjustment_ledger(scope,organization_id,delta,balance_before,balance_after,reason,actor_user_id)
  values ('ORGANIZATION',p_organization_id,v_delta,v_before,v_after,trim(p_reason),p_actor_user_id);

  return jsonb_build_object('ok', true, 'before', v_before, 'after', v_after, 'delta', v_delta);
end;
$$;

revoke all on function public.admin_adjust_organization_network_mail(uuid,text,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_adjust_organization_network_mail(uuid,text,integer,text,uuid) to service_role;

create or replace function public.queue_due_capacity_renewals(p_days_ahead integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted integer;
begin
  insert into public.organization_capacity_renewal_notices(term_id, organization_id, due_at, renewal_price_kurus, currency)
  select term.id, term.organization_id, term.expires_at, coalesce(term.renewal_price_kurus,0), term.currency
  from public.organization_capacity_terms term
  where term.status in ('ACTIVE','GRACE_PERIOD')
    and term.expires_at <= now() + make_interval(days => greatest(coalesce(p_days_ahead,30),0))
  on conflict(term_id) do nothing;
  get diagnostics v_inserted = row_count;
  return jsonb_build_object('ok', true, 'queued', v_inserted);
end;
$$;

revoke all on function public.queue_due_capacity_renewals(integer) from public, anon, authenticated;
grant execute on function public.queue_due_capacity_renewals(integer) to service_role;
