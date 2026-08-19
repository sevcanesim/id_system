create table if not exists public.corporate_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  company text not null,
  employee_count text not null default 'Belirtilmedi',
  message text,
  plan text not null default 'GENEL',
  source text not null default 'corporate_page',
  ip_hash text,
  status text not null default 'NEW' check (status in ('NEW','CONTACTED','QUALIFIED','CLOSED','SPAM')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists corporate_leads_created_at_idx on public.corporate_leads (created_at desc);
create index if not exists corporate_leads_status_idx on public.corporate_leads (status);

alter table public.corporate_leads enable row level security;

revoke all on public.corporate_leads from anon, authenticated;

create or replace function public.set_corporate_lead_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists corporate_leads_updated_at on public.corporate_leads;
create trigger corporate_leads_updated_at
before update on public.corporate_leads
for each row execute function public.set_corporate_lead_updated_at();
