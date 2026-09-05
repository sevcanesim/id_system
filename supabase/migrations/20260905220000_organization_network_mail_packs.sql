-- Network Mail packs can be purchased by an individual Premium account or by
-- one active organization. The checkout API stamps credit_scope and the
-- organization id server-side; this migration keeps the paid-order fulfilment
-- idempotent and leaves a reconciliation trail if that target is unavailable.

create table if not exists public.organization_network_mail_credit_grants (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.commerce_order_items(id) on delete restrict,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  credits integer not null check (credits > 0),
  created_at timestamptz not null default now()
);

create index if not exists organization_network_mail_credit_grants_organization_idx
  on public.organization_network_mail_credit_grants (organization_id, created_at desc);

alter table public.organization_network_mail_credit_grants enable row level security;
revoke all on table public.organization_network_mail_credit_grants from anon, authenticated, public;
grant all on table public.organization_network_mail_credit_grants to service_role;

-- Keep old paid individual orders fulfillable. Organization-scoped lines are
-- explicitly excluded so a buyer's personal Premium wallet can never receive
-- credits intended for a company.
create or replace function public.grant_paid_individual_network_mail_packs()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_item record;
  v_entitlement_id uuid;
  v_admin_access_grant_id uuid;
  v_credits integer;
  v_grant_id uuid;
begin
  if new.status <> 'PAID' or (tg_op = 'UPDATE' and old.status = 'PAID') then return new; end if;
  if new.user_id is null then return new; end if;

  for v_item in
    select oi.id, oi.quantity, oi.configuration, coalesce(pv.metadata, '{}'::jsonb) as metadata
    from public.commerce_order_items oi
    join public.product_variants pv on pv.id = oi.variant_id
    where oi.order_id = new.id
      and coalesce(pv.metadata ->> 'fulfillment_kind', '') = 'NETWORK_MAIL_CREDIT_PACK'
      and coalesce(oi.configuration ->> 'creditScope', 'INDIVIDUAL') = 'INDIVIDUAL'
      and coalesce(oi.configuration ->> 'organizationId', '') = ''
  loop
    v_credits := greatest(coalesce(nullif(v_item.metadata ->> 'credit_count', '')::integer, 0), 0) * v_item.quantity;
    v_entitlement_id := null;
    v_admin_access_grant_id := null;
    v_grant_id := null;

    select e.id into v_entitlement_id
    from public.entitlements e
    where e.user_id = new.user_id
      and e.package_code = 'INDIVIDUAL_PREMIUM'
      and e.status = 'ACTIVE'
      and (e.expires_at is null or e.expires_at > now() or (e.grace_ends_at is not null and e.grace_ends_at > now()))
    order by e.expires_at desc nulls last
    limit 1 for update;

    if v_entitlement_id is null then
      select g.id into v_admin_access_grant_id
      from public.admin_access_grants g
      where g.user_id = new.user_id
        and g.scope = 'INDIVIDUAL'
        and g.package_code = 'INDIVIDUAL_PREMIUM'
        and g.status = 'ACTIVE'
        and g.starts_at <= now()
        and (g.expires_at is null or g.expires_at > now())
      order by g.expires_at desc nulls last
      limit 1 for update;
    end if;

    if (v_entitlement_id is null and v_admin_access_grant_id is null) or v_credits < 1 then continue; end if;

    insert into public.individual_network_mail_credit_grants(order_item_id, entitlement_id, admin_access_grant_id, user_id, credits)
    values(v_item.id, v_entitlement_id, v_admin_access_grant_id, new.user_id, v_credits)
    on conflict(order_item_id) do nothing
    returning id into v_grant_id;

    if v_grant_id is not null then
      if v_entitlement_id is not null then
        perform public.apply_individual_network_mail(v_entitlement_id, 'GRANT', v_credits);
      else
        update public.admin_access_grants
        set network_mail_remaining = network_mail_remaining + v_credits,
            network_mail_limit = greatest(network_mail_limit, network_mail_remaining + v_credits),
            updated_at = now()
        where id = v_admin_access_grant_id;
      end if;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.grant_paid_organization_network_mail_packs()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_item record;
  v_organization_id uuid;
  v_credits integer;
  v_grant_id uuid;
  v_remaining integer;
  v_limit integer;
begin
  if new.status <> 'PAID' or (tg_op = 'UPDATE' and old.status = 'PAID') then return new; end if;

  for v_item in
    select oi.id, oi.quantity, oi.configuration, coalesce(pv.metadata, '{}'::jsonb) as metadata
    from public.commerce_order_items oi
    join public.product_variants pv on pv.id = oi.variant_id
    where oi.order_id = new.id
      and coalesce(pv.metadata ->> 'fulfillment_kind', '') = 'NETWORK_MAIL_CREDIT_PACK'
      and coalesce(oi.configuration ->> 'creditScope', '') = 'ORGANIZATION'
  loop
    if coalesce(v_item.configuration ->> 'organizationId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      perform public.record_commerce_fulfillment_issue(
        new.id,
        v_item.id,
        'INVALID_FULFILLMENT_METADATA',
        jsonb_build_object('fulfillment_kind', 'NETWORK_MAIL_CREDIT_PACK', 'credit_scope', 'ORGANIZATION')
      );
      continue;
    end if;

    v_organization_id := (v_item.configuration ->> 'organizationId')::uuid;
    v_credits := greatest(coalesce(nullif(v_item.metadata ->> 'credit_count', '')::integer, 0), 0) * v_item.quantity;
    if v_credits < 1 then
      perform public.record_commerce_fulfillment_issue(
        new.id,
        v_item.id,
        'INVALID_FULFILLMENT_METADATA',
        jsonb_build_object('fulfillment_kind', 'NETWORK_MAIL_CREDIT_PACK', 'organization_id', v_organization_id)
      );
      continue;
    end if;

    select mail_credits_remaining, mail_credit_limit
    into v_remaining, v_limit
    from public.organization_entitlements
    where organization_id = v_organization_id
    for update;

    if not found then
      perform public.record_commerce_fulfillment_issue(
        new.id,
        v_item.id,
        'BUSINESS_SUBSCRIPTION_MISSING',
        jsonb_build_object('fulfillment_kind', 'NETWORK_MAIL_CREDIT_PACK', 'organization_id', v_organization_id, 'credits', v_credits)
      );
      continue;
    end if;

    insert into public.organization_network_mail_credit_grants(order_item_id, organization_id, credits)
    values(v_item.id, v_organization_id, v_credits)
    on conflict(order_item_id) do nothing
    returning id into v_grant_id;

    if v_grant_id is not null then
      update public.organization_entitlements
      set mail_credits_remaining = mail_credits_remaining + v_credits,
          mail_credit_limit = greatest(mail_credit_limit, mail_credits_remaining + v_credits),
          updated_at = now()
      where organization_id = v_organization_id;

      insert into public.admin_audit_log(actor_user_id, action, target_table, target_id, before_value, after_value)
      values(
        new.user_id,
        'ORGANIZATION_NETWORK_MAIL_PACK_FULFILLED',
        'organization_entitlements',
        v_organization_id::text,
        jsonb_build_object('remaining', v_remaining, 'limit', v_limit),
        jsonb_build_object('remaining', v_remaining + v_credits, 'limit', greatest(v_limit, v_remaining + v_credits), 'credits_added', v_credits, 'order_id', new.id, 'order_item_id', v_item.id)
      );
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists commerce_orders_grant_organization_network_mail_packs on public.commerce_orders;
create trigger commerce_orders_grant_organization_network_mail_packs
after insert or update of status on public.commerce_orders
for each row execute function public.grant_paid_organization_network_mail_packs();

revoke all on function public.grant_paid_organization_network_mail_packs() from public, anon, authenticated;
grant execute on function public.grant_paid_organization_network_mail_packs() to service_role;
