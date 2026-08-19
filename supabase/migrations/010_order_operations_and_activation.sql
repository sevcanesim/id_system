-- v21.1: satış sonrası operasyon, kargo takibi ve aktivasyon yaşam döngüsü.
alter table public.commerce_orders
  add column if not exists tracking_company text,
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists activation_deadline_at timestamptz;

create index if not exists commerce_orders_user_created_idx on public.commerce_orders(user_id, created_at desc);
create index if not exists commerce_orders_status_created_idx on public.commerce_orders(status, created_at desc);

-- Ödeme ile aktivasyon arasında 30 günlük üst sınır tutulur.
update public.commerce_orders
set activation_deadline_at = paid_at + interval '30 days'
where paid_at is not null and activation_deadline_at is null;

-- Aktivasyon tokenları yalnız bir kez kullanılabilir; aktif token sorguları hızlandırılır.
create index if not exists activation_tokens_order_active_idx
  on public.activation_tokens(order_id, expires_at desc)
  where used_at is null;
