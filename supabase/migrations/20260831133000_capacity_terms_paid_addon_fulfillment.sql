-- Create one independent renewal term for each successfully fulfilled paid
-- corporate capacity order item. Idempotency remains keyed by order_item_id.

create or replace function public.apply_paid_corporate_card_capacity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  item record;
  v_org_id uuid;
  v_card_count integer;
  v_subscription_id uuid;
  v_inserted integer;
  v_renewal_price_kurus integer;
  v_term_starts_at timestamptz;
begin
  if new.status <> 'PAID' then
    return new;
  end if;

  for item in
    select coi.id, coi.order_id, coi.quantity, coi.configuration
    from public.commerce_order_items coi
    where coi.order_id = new.id
  loop
    begin
      v_org_id := nullif(item.configuration->>'organizationId', '')::uuid;
      v_card_count := greatest(0, coalesce((item.configuration->>'seatCount')::integer, 0)) * greatest(1, item.quantity);
      v_renewal_price_kurus := nullif(item.configuration->>'renewalPriceKurus', '')::integer;
    exception when others then
      continue;
    end;

    if v_org_id is null or v_card_count <= 0 then
      continue;
    end if;

    if v_renewal_price_kurus is not null and v_renewal_price_kurus < 0 then
      v_renewal_price_kurus := null;
    end if;

    select s.id into v_subscription_id
    from public.organization_subscriptions s
    where s.organization_id = v_org_id
      and s.status = 'ACTIVE'
    order by s.created_at desc
    limit 1
    for update;

    if v_subscription_id is null then
      raise warning 'Paid corporate card capacity blocked because subscription is not ACTIVE: org %, order item %', v_org_id, item.id;
      continue;
    end if;

    insert into public.organization_card_capacity_ledger(organization_id, order_id, order_item_id, card_count)
    values (v_org_id, new.id, item.id, v_card_count)
    on conflict (order_item_id) do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
      continue;
    end if;

    update public.organization_subscriptions
       set seat_limit = seat_limit + v_card_count
     where id = v_subscription_id
       and status = 'ACTIVE';

    if not found then
      delete from public.organization_card_capacity_ledger
      where order_item_id = item.id;
      raise warning 'Paid corporate card capacity lost ACTIVE state before fulfillment: org %, order item %', v_org_id, item.id;
      continue;
    end if;

    v_term_starts_at := now();

    insert into public.organization_capacity_terms(
      organization_id,
      source_order_id,
      source_order_item_id,
      card_count,
      starts_at,
      expires_at,
      renewal_price_kurus,
      currency,
      status
    )
    values (
      v_org_id,
      new.id,
      item.id,
      v_card_count,
      v_term_starts_at,
      v_term_starts_at + interval '12 months',
      v_renewal_price_kurus,
      'TRY',
      'ACTIVE'
    )
    on conflict (source_order_item_id) where source_order_item_id is not null do nothing;
  end loop;

  return new;
end;
$$;

revoke all on function public.apply_paid_corporate_card_capacity() from public, anon, authenticated;
grant execute on function public.apply_paid_corporate_card_capacity() to service_role;

comment on function public.apply_paid_corporate_card_capacity() is
  'Idempotently grants paid corporate card capacity and creates a separate 12-month renewal term per commerce order item.';
