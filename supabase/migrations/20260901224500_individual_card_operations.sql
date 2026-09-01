-- Individual physical-card operations lifecycle.
-- Commercial fulfillment remains authoritative for whether a paid physical card unit exists.
-- Profile completion can only move an existing paid unit into the print queue.

alter table public.commerce_physical_card_units
  add column if not exists operational_status text not null default 'PROFILE_REQUIRED',
  add column if not exists print_requested_at timestamptz,
  add column if not exists print_approved_at timestamptz,
  add column if not exists shipping_pending_at timestamptz,
  add column if not exists carrier text,
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz,
  add column if not exists out_for_delivery_at timestamptz,
  add column if not exists delivered_at timestamptz;

do $$
begin
  alter table public.commerce_physical_card_units
    add constraint commerce_physical_card_units_operational_status_check
    check (operational_status in (
      'PROFILE_REQUIRED',
      'PRINT_PENDING',
      'SHIPPING_PENDING',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED'
    ));
exception
  when duplicate_object then null;
end $$;

create index if not exists commerce_physical_card_units_operational_queue_idx
  on public.commerce_physical_card_units(operational_status, created_at);

create table if not exists public.commerce_card_operation_events (
  id uuid primary key default gen_random_uuid(),
  card_unit_id uuid not null references public.commerce_physical_card_units(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'PROFILE_COMPLETED',
    'PRINT_APPROVED',
    'SHIPPING_CREATED',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED'
  )),
  from_status text,
  to_status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists commerce_card_operation_events_unit_idx
  on public.commerce_card_operation_events(card_unit_id, created_at desc);

alter table public.commerce_card_operation_events enable row level security;

drop policy if exists "Users can read own card operation events" on public.commerce_card_operation_events;
create policy "Users can read own card operation events"
on public.commerce_card_operation_events for select to authenticated
using (exists(
  select 1
  from public.commerce_physical_card_units unit
  join public.commerce_order_items item on item.id = unit.order_item_id
  join public.commerce_orders orders on orders.id = item.order_id
  where unit.id = card_unit_id and orders.user_id = auth.uid()
));

-- Service-role-only state transition used after an individual profile has been
-- successfully persisted. It is idempotent and cannot manufacture fulfillment.
create or replace function public.mark_card_unit_print_pending(
  p_card_unit_id uuid,
  p_actor_user_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_from text;
begin
  select operational_status into v_from
  from public.commerce_physical_card_units
  where id = p_card_unit_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'CARD_UNIT_NOT_FOUND');
  end if;

  if v_from = 'PRINT_PENDING' then
    return jsonb_build_object('ok', true, 'status', 'PRINT_PENDING', 'idempotent', true);
  end if;

  if v_from <> 'PROFILE_REQUIRED' then
    return jsonb_build_object('ok', true, 'status', v_from, 'idempotent', true);
  end if;

  update public.commerce_physical_card_units
  set operational_status = 'PRINT_PENDING',
      print_requested_at = coalesce(print_requested_at, now()),
      updated_at = now()
  where id = p_card_unit_id;

  insert into public.commerce_card_operation_events(
    card_unit_id, actor_user_id, event_type, from_status, to_status
  ) values (
    p_card_unit_id, p_actor_user_id, 'PROFILE_COMPLETED', v_from, 'PRINT_PENDING'
  );

  return jsonb_build_object('ok', true, 'status', 'PRINT_PENDING');
end;
$$;

revoke all on function public.mark_card_unit_print_pending(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_card_unit_print_pending(uuid, uuid) to service_role;

comment on column public.commerce_physical_card_units.operational_status is
  'User-visible print/shipping workflow. Commercial fulfillment status remains separate.';
