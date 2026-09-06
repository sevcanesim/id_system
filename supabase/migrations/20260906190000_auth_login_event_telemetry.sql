create table if not exists public.auth_login_events (
  id uuid primary key default gen_random_uuid(),
  succeeded boolean not null,
  reason text not null check (reason ~ '^[a-z0-9_:-]{1,120}$'),
  email_domain text,
  is_test_identity boolean not null default false,
  ip_fingerprint text,
  user_fingerprint text,
  occurred_at timestamptz not null default now()
);

create index if not exists auth_login_events_occurred_at_idx
  on public.auth_login_events (occurred_at desc);

create index if not exists auth_login_events_reason_occurred_at_idx
  on public.auth_login_events (reason, occurred_at desc);

alter table public.auth_login_events enable row level security;
revoke all on public.auth_login_events from public, anon, authenticated;
grant all on public.auth_login_events to service_role;

create or replace function public.purge_auth_login_events(
  p_retention_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer := 0;
begin
  if p_retention_days < 30 or p_retention_days > 365 then
    raise exception 'INVALID_AUTH_LOGIN_RETENTION';
  end if;

  delete from public.auth_login_events
  where occurred_at < now() - make_interval(days => p_retention_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.purge_auth_login_events(integer) from public, anon, authenticated;
grant execute on function public.purge_auth_login_events(integer) to service_role;
