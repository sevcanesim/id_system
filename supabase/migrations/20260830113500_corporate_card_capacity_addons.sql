-- Corporate add-on orders are card-capacity purchases, not a separate license product.
-- Idempotency is guaranteed per commerce_order_item.

create table if not exists public.organization_card_capacity_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  order_item_id uuid not null references public.commerce_order_items(id) on delete cascade,
  card_count integer not null check (card_count > 0),
  created_at timestamptz not null default now(),
  unique(order_item_id)
);

alter table public.organization_card_capacity_ledger enable row level security;

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
  v_inserted integer;
begin
  if new.status <> 'PAID' then
    return new;
  end if;

  -- Re-running a webhook/callback must never increase capacity twice.
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

    insert into public.organization_card_capacity_ledger(organization_id, order_id, order_item_id, card_count)
    values (v_org_id, new.id, item.id, v_card_count)
    on conflict (order_item_id) do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted = 0 then
      continue;
    end if;

    -- Current schema keeps commercial capacity in organization_subscriptions.seat_limit.
    -- Product/UI language is now "card capacity"; column rename is intentionally deferred.
    update public.organization_subscriptions s
       set seat_limit = s.seat_limit + v_card_count
     where s.id = (
       select s2.id
       from public.organization_subscriptions s2
       where s2.organization_id = v_org_id
         and s2.status in ('ACTIVE','GRACE_PERIOD')
       order by s2.created_at desc
       limit 1
     );

    if not found then
      -- Do not silently lose a paid add-on. The ledger remains as evidence and
      -- operations can reconcile it after the base corporate subscription exists.
      raise warning 'Paid corporate card capacity has no active subscription: org %, order item %', v_org_id, item.id;
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.apply_paid_corporate_card_capacity() from public, anon, authenticated;
grant execute on function public.apply_paid_corporate_card_capacity() to service_role;

drop trigger if exists trg_apply_paid_corporate_card_capacity on public.commerce_orders;
create trigger trg_apply_paid_corporate_card_capacity
after insert or update of status on public.commerce_orders
for each row
when (new.status = 'PAID')
execute function public.apply_paid_corporate_card_capacity();
