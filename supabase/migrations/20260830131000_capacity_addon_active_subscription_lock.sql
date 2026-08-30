-- Defense in depth for corporate capacity add-ons.
-- Checkout blocks GRACE_PERIOD purchases, and fulfillment independently refuses
-- to mutate capacity unless the target subscription is fully ACTIVE.

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
    exception when others then
      continue;
    end;

    if v_org_id is null or v_card_count <= 0 then
      continue;
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
      -- The row was locked above, so this is defensive. Roll the ledger insert
      -- back inside this trigger transaction rather than recording capacity that
      -- was not actually granted.
      delete from public.organization_card_capacity_ledger
      where order_item_id = item.id;
      raise warning 'Paid corporate card capacity lost ACTIVE state before fulfillment: org %, order item %', v_org_id, item.id;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.apply_paid_corporate_card_capacity() from public, anon, authenticated;
grant execute on function public.apply_paid_corporate_card_capacity() to service_role;
