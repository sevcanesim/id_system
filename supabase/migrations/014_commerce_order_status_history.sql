-- v22.15: tek commerce sipariş yaşam döngüsü ve denetlenebilir durum geçmişi.
create table if not exists public.commerce_order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  from_status public.commerce_order_status,
  to_status public.commerce_order_status not null,
  changed_by_user_id uuid references auth.users(id) on delete set null,
  source text not null default 'SYSTEM' check (source in ('SYSTEM','PAYMENT','ADMIN','CUSTOMER')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists commerce_order_status_history_order_created_idx
  on public.commerce_order_status_history(order_id, created_at desc);

alter table public.commerce_order_status_history enable row level security;

drop policy if exists "Users can read own order status history" on public.commerce_order_status_history;
create policy "Users can read own order status history"
on public.commerce_order_status_history for select to authenticated
using (
  exists (
    select 1 from public.commerce_orders o
    where o.id = order_id and o.user_id = auth.uid()
  )
);

-- Mevcut siparişler için ilk durum kaydı oluşturulur.
insert into public.commerce_order_status_history(order_id, from_status, to_status, source, note)
select o.id, null, o.status, 'SYSTEM', 'v22.15 geçmiş başlangıç kaydı'
from public.commerce_orders o
where not exists (
  select 1 from public.commerce_order_status_history h where h.order_id = o.id
);
