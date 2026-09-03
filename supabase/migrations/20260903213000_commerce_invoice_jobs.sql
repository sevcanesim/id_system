-- Yenomi ID: paid commerce orders create one immutable invoice job.
-- Actual Mysoft dispatch remains disabled until Yenomi's own issuer account,
-- Internet Sales e-Arşiv design and production credentials are configured.

create table if not exists public.commerce_invoice_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.commerce_orders(id) on delete restrict,
  provider text not null default 'MYSOFT' check (provider = upper(provider)),
  document_type text not null default 'E_ARCHIVE' check (document_type in ('E_ARCHIVE', 'E_INVOICE')),
  status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'ISSUED', 'RETRYABLE', 'NEEDS_RECONCILIATION', 'CANCELLED')),
  idempotency_key text not null unique,
  invoice_snapshot jsonb not null,
  attempts integer not null default 0 check (attempts >= 0),
  processing_started_at timestamptz,
  next_attempt_at timestamptz,
  issued_at timestamptz,
  provider_invoice_id text,
  provider_invoice_number text,
  provider_invoice_ettn text,
  provider_document_url text,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commerce_invoice_jobs_pending_idx
  on public.commerce_invoice_jobs(status, next_attempt_at, created_at)
  where status in ('PENDING', 'RETRYABLE');

create unique index if not exists commerce_invoice_jobs_provider_ettn_uidx
  on public.commerce_invoice_jobs(provider, provider_invoice_ettn)
  where provider_invoice_ettn is not null;

alter table public.commerce_invoice_jobs enable row level security;

create or replace function public.queue_paid_commerce_invoice_job()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb;
begin
  if new.status <> 'PAID' then
    return new;
  end if;

  if TG_OP = 'UPDATE' and old.status = 'PAID' then
    return new;
  end if;

  select jsonb_build_object(
    'version', 1,
    'order', jsonb_build_object(
      'id', new.id,
      'number', new.order_number,
      'currency', new.currency,
      'subtotalKurus', new.subtotal_kurus,
      'shippingKurus', new.shipping_kurus,
      'totalKurus', new.total_kurus,
      'paidAt', coalesce(new.paid_at, now())
    ),
    'buyer', jsonb_build_object(
      'name', new.customer_name,
      'email', new.guest_email,
      'phone', new.customer_phone,
      'companyName', new.company_name,
      'taxNumber', new.tax_number,
      'taxOffice', new.tax_office,
      'countryCode', new.country_code
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'name', item.product_name,
        'sku', item.configuration ->> 'sku',
        'kind', item.product_kind,
        'quantity', item.quantity,
        'unitPriceKurus', item.unit_price_kurus
      ) order by item.id)
      from public.commerce_order_items item
      where item.order_id = new.id
    ), '[]'::jsonb),
    'shipping', coalesce((
      select jsonb_build_object(
        'recipientName', address.recipient_name,
        'phone', address.phone,
        'addressLine', address.address_line,
        'district', address.district,
        'city', address.city,
        'postalCode', address.postal_code,
        'countryCode', address.country_code
      )
      from public.shipping_addresses address
      where address.order_id = new.id
    ), 'null'::jsonb),
    'payment', jsonb_build_object(
      'provider', 'IYZICO',
      'method', 'KREDIKARTI/BANKAKARTI',
      'paidAt', coalesce(new.paid_at, now())
    )
  ) into v_snapshot;

  insert into public.commerce_invoice_jobs (
    order_id,
    idempotency_key,
    invoice_snapshot
  ) values (
    new.id,
    'commerce-invoice:' || new.id::text,
    v_snapshot
  )
  on conflict (order_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_queue_paid_commerce_invoice_job on public.commerce_orders;
create trigger trg_queue_paid_commerce_invoice_job
after insert or update of status on public.commerce_orders
for each row execute function public.queue_paid_commerce_invoice_job();

revoke all on function public.queue_paid_commerce_invoice_job() from public;
grant execute on function public.queue_paid_commerce_invoice_job() to service_role;
