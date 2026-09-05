-- Network Mail is an individual Premium add-on. It is intentionally a
-- separate, paid credit grant: no new subscription, card or invoice shortcut.

update public.products
set is_active = false,
    status = 'COMING_SOON'
where slug = 'dijital-kartvizit';

update public.product_variants
set is_active = false
where sku = 'YENOMI-DIGITAL-ANNUAL'
   or coalesce(metadata ->> 'package_code', '') = 'INDIVIDUAL_DIGITAL'
   or coalesce(metadata ->> 'fulfillment_kind', '') = 'DIGITAL_INITIAL';

update public.product_variants
set is_active = true,
    metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{live_checkout}', 'true'::jsonb, true)
where sku in (
  'YENOMI-NETWORK-MAIL-100',
  'YENOMI-NETWORK-MAIL-500',
  'YENOMI-NETWORK-MAIL-1000',
  'YENOMI-NETWORK-MAIL-5000'
);

create table if not exists public.individual_network_mail_credit_grants (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.commerce_order_items(id) on delete restrict,
  entitlement_id uuid references public.entitlements(id) on delete restrict,
  admin_access_grant_id uuid references public.admin_access_grants(id) on delete restrict,
  user_id uuid not null references public.user_accounts(id) on delete restrict,
  credits integer not null check (credits > 0),
  created_at timestamptz not null default now(),
  check (num_nonnulls(entitlement_id, admin_access_grant_id) = 1)
);
alter table public.individual_network_mail_credit_grants enable row level security;
revoke all on table public.individual_network_mail_credit_grants from anon, authenticated, public;
grant all on table public.individual_network_mail_credit_grants to service_role;

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
    select oi.id, oi.quantity, coalesce(pv.metadata, '{}'::jsonb) as metadata
    from public.commerce_order_items oi
    join public.product_variants pv on pv.id = oi.variant_id
    where oi.order_id = new.id
      and coalesce(pv.metadata ->> 'fulfillment_kind', '') = 'NETWORK_MAIL_CREDIT_PACK'
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

drop trigger if exists commerce_orders_grant_network_mail_packs on public.commerce_orders;
create trigger commerce_orders_grant_network_mail_packs
after insert or update of status on public.commerce_orders
for each row execute function public.grant_paid_individual_network_mail_packs();

revoke all on function public.grant_paid_individual_network_mail_packs() from public, anon, authenticated;
grant execute on function public.grant_paid_individual_network_mail_packs() to service_role;

-- Complimentary Premium access uses the same customer-facing Network Mail
-- behaviour as paid Premium. A refund can resolve either ledger source.
create or replace function public.consume_individual_network_mail(p_user_id uuid, p_debit integer)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_entitlement_id uuid;
  v_grant_id uuid;
  v_remaining integer;
begin
  if p_debit is null or p_debit < 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_DEBIT');
  end if;

  select e.id into v_entitlement_id
  from public.entitlements e
  where e.user_id = p_user_id
    and e.status = 'ACTIVE'
    and e.package_code = 'INDIVIDUAL_PREMIUM'
    and e.network_mail_remaining >= p_debit
    and (e.expires_at is null or e.expires_at > now() or (e.grace_ends_at is not null and e.grace_ends_at > now()))
  order by e.expires_at desc nulls last
  limit 1 for update;

  if v_entitlement_id is not null then
    update public.entitlements
    set network_mail_remaining = network_mail_remaining - p_debit,
        updated_at = now()
    where id = v_entitlement_id
    returning network_mail_remaining into v_remaining;
    return jsonb_build_object('ok', true, 'remaining', v_remaining, 'debit', p_debit, 'entitlement_id', v_entitlement_id);
  end if;

  select g.id into v_grant_id
  from public.admin_access_grants g
  where g.user_id = p_user_id
    and g.scope = 'INDIVIDUAL'
    and g.package_code = 'INDIVIDUAL_PREMIUM'
    and g.status = 'ACTIVE'
    and g.starts_at <= now()
    and (g.expires_at is null or g.expires_at > now())
    and g.network_mail_remaining >= p_debit
  order by g.expires_at desc nulls last
  limit 1 for update;
  if v_grant_id is null then
    return jsonb_build_object('ok', false, 'code', 'INSUFFICIENT_NETWORK_MAIL');
  end if;

  update public.admin_access_grants
  set network_mail_remaining = network_mail_remaining - p_debit,
      updated_at = now()
  where id = v_grant_id
  returning network_mail_remaining into v_remaining;
  return jsonb_build_object('ok', true, 'remaining', v_remaining, 'debit', p_debit, 'entitlement_id', v_grant_id, 'ledger_kind', 'ADMIN_ACCESS_GRANT');
end;
$$;

create or replace function public.refund_individual_network_mail(p_entitlement_id uuid, p_amount integer)
returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_remaining integer;
begin
  if p_amount is null or p_amount < 1 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT');
  end if;

  update public.entitlements
  set network_mail_remaining = network_mail_remaining + p_amount,
      updated_at = now()
  where id = p_entitlement_id
  returning network_mail_remaining into v_remaining;
  if found then return jsonb_build_object('ok', true, 'remaining', v_remaining); end if;

  update public.admin_access_grants
  set network_mail_remaining = least(network_mail_limit, network_mail_remaining + p_amount),
      updated_at = now()
  where id = p_entitlement_id
    and scope = 'INDIVIDUAL'
    and status = 'ACTIVE'
  returning network_mail_remaining into v_remaining;
  if found then return jsonb_build_object('ok', true, 'remaining', v_remaining); end if;
  return jsonb_build_object('ok', false, 'code', 'ENTITLEMENT_NOT_FOUND');
end;
$$;

revoke all on function public.consume_individual_network_mail(uuid, integer) from public, anon, authenticated;
revoke all on function public.refund_individual_network_mail(uuid, integer) from public, anon, authenticated;
grant execute on function public.consume_individual_network_mail(uuid, integer) to service_role;
grant execute on function public.refund_individual_network_mail(uuid, integer) to service_role;
