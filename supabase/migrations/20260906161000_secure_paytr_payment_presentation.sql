alter table public.commerce_payment_attempts
  add column if not exists payment_token_ciphertext text,
  add column if not exists payment_token_expires_at timestamptz,
  add column if not exists payment_presentation_secret_hash text;

create index if not exists commerce_payment_attempts_presentation_expiry_idx
  on public.commerce_payment_attempts(payment_token_expires_at)
  where status = 'PENDING' and payment_token_expires_at is not null;

alter table public.commerce_payment_attempts
  add constraint commerce_payment_attempts_presentation_fields_check
  check (
    (payment_token_ciphertext is null and payment_token_expires_at is null and payment_presentation_secret_hash is null)
    or
    (payment_token_ciphertext is not null and payment_token_expires_at is not null and payment_presentation_secret_hash is not null)
  );
