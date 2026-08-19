-- v21.2: aktivasyon e-postası, yedek kart varyantı ve kurumsal çalışan yönetimi.
create table if not exists public.commerce_email_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.commerce_orders(id) on delete cascade,
  event_type text not null check (event_type in ('ACTIVATION','ACTIVATION_RESEND','SHIPPING','RENEWAL')),
  recipient text not null,
  status text not null check (status in ('SENT','FAILED','SKIPPED')),
  provider_message text,
  created_at timestamptz not null default now()
);
create index if not exists commerce_email_events_order_idx on public.commerce_email_events(order_id,created_at desc);
alter table public.commerce_email_events enable row level security;

insert into public.product_variants(product_id,sku,name,price_kurus,billing_period,metadata)
select id,'YENOMI-NFC-EXTRA','Ek / Yedek NFC + QR Kart',29900,'ONE_TIME',
  '{"shippingIncluded":true,"country":"TR","requiresExistingProfile":true}'::jsonb
from public.products where slug='nfc-business-card'
on conflict (sku) do update set price_kurus=excluded.price_kurus,metadata=excluded.metadata,is_active=true;

create index if not exists organization_members_org_status_idx on public.organization_members(organization_id,status);
drop policy if exists "Managers can add organization members" on public.organization_members;
create policy "Managers can add organization members" on public.organization_members for insert to authenticated with check (
  public.is_active_organization_member(organization_id, array['OWNER','ADMIN','HR']::text[])
);
