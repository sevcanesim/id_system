alter table public.commerce_physical_card_units
  add column if not exists physical_card_id uuid references public.physical_cards(id) on delete restrict;

create unique index if not exists commerce_physical_card_units_physical_card_unique
  on public.commerce_physical_card_units(physical_card_id)
  where physical_card_id is not null;

create index if not exists commerce_physical_card_units_order_item_idx
  on public.commerce_physical_card_units(order_item_id);

comment on column public.commerce_physical_card_units.physical_card_id is
  'Explicit production provenance link. A scanned card is never considered owned until a production unit has been linked to this physical card.';
