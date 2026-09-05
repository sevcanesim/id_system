create table if not exists public.commerce_checkout_resume_codes (
  order_id uuid primary key references public.commerce_orders(id) on delete cascade,
  code_hash text not null unique check (char_length(code_hash) = 64),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_checkout_resume_codes_expiry_check check (expires_at > created_at)
);

create index if not exists commerce_checkout_resume_codes_expiry_idx
  on public.commerce_checkout_resume_codes(expires_at)
  where redeemed_at is null;

alter table public.commerce_checkout_resume_codes enable row level security;
revoke all on public.commerce_checkout_resume_codes from public, anon, authenticated;
grant all on public.commerce_checkout_resume_codes to service_role;

drop trigger if exists commerce_checkout_resume_codes_set_updated_at on public.commerce_checkout_resume_codes;
create trigger commerce_checkout_resume_codes_set_updated_at
before update on public.commerce_checkout_resume_codes
for each row execute function public.set_updated_at();
