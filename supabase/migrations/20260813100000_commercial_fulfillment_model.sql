-- v25.9: Commercial fulfillment model.
-- Separates digital service entitlement from physical card production.

create table if not exists public.commerce_physical_card_units (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.commerce_order_items(id) on delete cascade,
  instance_no integer not null check (instance_no > 0),
  purpose text not null check (purpose in ('INITIAL_BUNDLE','EXTRA_CARD','REPLACEMENT_CARD','BUSINESS_INITIAL','BUSINESS_CAPACITY_ADDON')),
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'PENDING_PRODUCTION'
    check (status in ('PENDING_PRODUCTION','IN_PRODUCTION','PRODUCED','SHIPPED','ACTIVATED','CANCELLED')),
  physical_card_id uuid references public.physical_cards(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_item_id, instance_no)
);

create index if not exists commerce_physical_card_units_status_idx
  on public.commerce_physical_card_units(status, created_at);
create index if not exists commerce_physical_card_units_organization_idx
  on public.commerce_physical_card_units(organization_id, created_at);

alter table public.commerce_physical_card_units enable row level security;
drop policy if exists "Users can read own physical fulfillment units" on public.commerce_physical_card_units;
create policy "Users can read own physical fulfillment units"
on public.commerce_physical_card_units for select to authenticated
using (exists(
  select 1 from public.commerce_order_items i
  join public.commerce_orders o on o.id=i.order_id
  where i.id=order_item_id and o.user_id=auth.uid()
));

-- Make the commercial meaning machine-readable. Capacity add-ons deliberately
-- follow the current subscription term; they do not silently extend expires_at.
update public.product_variants
set metadata = metadata || '{"fulfillment_kind":"INITIAL_BUNDLE","digital_service_included":true,"physical_card_count":1}'::jsonb
where sku='YENOMI-NFC-CARD-ANNUAL';

update public.product_variants
set metadata = (metadata - 'service_days' - 'grace_days') ||
  '{"fulfillment_kind":"EXTRA_CARD","digital_service_included":false,"physical_card_count":1,"term_basis":"ACTIVE_ENTITLEMENT"}'::jsonb
where sku='YENOMI-NFC-EXTRA';

update public.product_variants
set metadata = (metadata - 'service_days' - 'grace_days') ||
  '{"fulfillment_kind":"BUSINESS_CAPACITY_ADDON","digital_service_included":false,"term_basis":"CURRENT_SUBSCRIPTION_TERM"}'::jsonb
where sku like 'YENOMI-BUSINESS-SEATS-%';

-- The existing payment callback inserts one candidate entitlement for every
-- paid physical order unit. This trigger routes that candidate according to
-- the authoritative SKU and creates production units. Returning null for
-- EXTRA_CARD and BUSINESS_CAPACITY_ADDON prevents an accidental new 365-day
-- personal entitlement.
create or replace function public.route_commerce_fulfillment()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_item public.commerce_order_items%rowtype;
  v_sku text;
  v_kind text;
  v_org_id uuid;
  v_card_count integer;
  v_index integer;
begin
  -- PostgreSQL does not allow a composite record variable (v_item) to be
  -- mixed with scalar targets in the same multi-item INTO list. Load the
  -- order item first, then resolve the variant metadata separately.
  select i.*
  into v_item
  from public.commerce_order_items i
  where i.id=new.order_item_id;

  if not found then return new; end if;

  select pv.sku,
    coalesce(pv.metadata->>'fulfillment_kind',
      case when pv.sku='YENOMI-NFC-EXTRA' then 'EXTRA_CARD'
           when pv.sku like 'YENOMI-BUSINESS-SEATS-%' then 'BUSINESS_CAPACITY_ADDON'
           else 'INITIAL_BUNDLE' end)
  into v_sku, v_kind
  from public.product_variants pv
  where pv.id=v_item.variant_id;

  if not found then return new; end if;
  v_org_id := nullif(v_item.configuration->>'organizationId','')::uuid;

  if v_kind='BUSINESS_CAPACITY_ADDON' then
    v_card_count := greatest(coalesce(nullif(v_item.configuration->>'seatCount','')::integer,0),1);
    for v_index in 1..v_card_count loop
      insert into public.commerce_physical_card_units(order_item_id,instance_no,purpose,organization_id)
      values(v_item.id,((new.instance_no-1)*v_card_count)+v_index,'BUSINESS_CAPACITY_ADDON',v_org_id)
      on conflict(order_item_id,instance_no) do nothing;
    end loop;
    return null;
  end if;

  insert into public.commerce_physical_card_units(order_item_id,instance_no,purpose,organization_id)
  values(v_item.id,new.instance_no,
    case when v_kind='EXTRA_CARD' then 'EXTRA_CARD'
         when v_kind='REPLACEMENT_CARD' then 'REPLACEMENT_CARD'
         when v_kind='BUSINESS_INITIAL' then 'BUSINESS_INITIAL'
         else 'INITIAL_BUNDLE' end,
    v_org_id)
  on conflict(order_item_id,instance_no) do nothing;

  if v_kind in ('EXTRA_CARD','REPLACEMENT_CARD') then return null; end if;
  return new;
end;
$$;

drop trigger if exists entitlements_route_commerce_fulfillment on public.entitlements;
create trigger entitlements_route_commerce_fulfillment
before insert on public.entitlements
for each row execute function public.route_commerce_fulfillment();

revoke all on function public.route_commerce_fulfillment() from public,anon,authenticated;
grant execute on function public.route_commerce_fulfillment() to service_role;

-- Existing incorrectly-created extra/seat entitlements are intentionally not
-- deleted automatically. Production rollout must audit linked profiles/cards
-- before any corrective data migration.
