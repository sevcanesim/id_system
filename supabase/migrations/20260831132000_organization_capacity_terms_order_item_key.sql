-- Capacity renewal terms are purchase-item scoped, not merely order scoped.
-- One commerce order may contain multiple independent capacity items.

alter table public.organization_capacity_terms
  add column if not exists source_order_item_id uuid null
    references public.commerce_order_items(id) on delete set null;

drop index if exists public.organization_capacity_terms_source_order_uidx;

create unique index if not exists organization_capacity_terms_source_order_item_uidx
  on public.organization_capacity_terms(source_order_item_id)
  where source_order_item_id is not null;

create index if not exists organization_capacity_terms_source_order_idx
  on public.organization_capacity_terms(source_order_id)
  where source_order_id is not null;

comment on column public.organization_capacity_terms.source_order_id is
  'Parent commerce order for grouping/audit. Multiple capacity terms may belong to the same order.';

comment on column public.organization_capacity_terms.source_order_item_id is
  'Exact commerce order item that created this independent capacity term. Used as the idempotency key for purchase-scoped renewal terms.';
