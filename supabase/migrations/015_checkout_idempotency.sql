-- v22.16: checkout idempotency and safe payment retry support.

alter table public.commerce_payment_attempts
  add column if not exists idempotency_key text,
  add column if not exists payment_page_url text;

create unique index if not exists commerce_payment_attempts_idempotency_uidx
  on public.commerce_payment_attempts(idempotency_key)
  where idempotency_key is not null;

create index if not exists commerce_payment_attempts_fingerprint_idx
  on public.commerce_payment_attempts(request_fingerprint);
