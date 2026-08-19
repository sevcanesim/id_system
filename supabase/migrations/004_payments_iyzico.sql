do $$ begin
  create type public.payment_status as enum ('UNPAID','PENDING','PAID','FAILED','REFUNDED','CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_attempt_status as enum ('PENDING','PAID','FAILED','REFUNDED');
exception when duplicate_object then null; end $$;

alter table public.nfc_orders add column if not exists payment_status public.payment_status not null default 'UNPAID';
alter table public.nfc_orders add column if not exists amount_kurus integer;
alter table public.nfc_orders add column if not exists paid_at timestamptz;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.nfc_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('IYZICO','PAYTR')),
  status public.payment_attempt_status not null default 'PENDING',
  amount_kurus integer not null check (amount_kurus > 0),
  currency text not null default 'TRY',
  conversation_id text not null unique,
  provider_token text unique,
  provider_payment_id text,
  error_code text,
  error_message text,
  raw_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_attempts enable row level security;

drop policy if exists "Users can read own payment attempts" on public.payment_attempts;
create policy "Users can read own payment attempts" on public.payment_attempts for select to authenticated
using (auth.uid() = user_id or exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop trigger if exists payment_attempts_set_updated_at on public.payment_attempts;
create trigger payment_attempts_set_updated_at before update on public.payment_attempts
for each row execute function public.set_updated_at();
