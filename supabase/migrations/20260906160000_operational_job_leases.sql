create table if not exists public.operational_job_leases (
  job_name text primary key check (job_name ~ '^[a-z0-9:_-]{1,120}$'),
  lease_token uuid not null,
  lease_expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.operational_job_leases enable row level security;
revoke all on public.operational_job_leases from anon, authenticated, public;
grant all on public.operational_job_leases to service_role;

create or replace function public.acquire_operational_job_lease(
  p_job_name text,
  p_lease_seconds integer default 600
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_token uuid := gen_random_uuid();
  v_acquired uuid;
begin
  if p_job_name !~ '^[a-z0-9:_-]{1,120}$' or p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'INVALID_JOB_LEASE_REQUEST';
  end if;

  insert into public.operational_job_leases as leases (
    job_name,
    lease_token,
    lease_expires_at,
    updated_at
  ) values (
    p_job_name,
    v_token,
    now() + make_interval(secs => p_lease_seconds),
    now()
  )
  on conflict (job_name) do update
  set
    lease_token = excluded.lease_token,
    lease_expires_at = excluded.lease_expires_at,
    updated_at = excluded.updated_at
  where leases.lease_expires_at <= now()
  returning lease_token into v_acquired;

  return v_acquired;
end;
$$;

create or replace function public.release_operational_job_lease(
  p_job_name text,
  p_lease_token uuid
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.operational_job_leases
  set lease_expires_at = now(), updated_at = now()
  where job_name = p_job_name and lease_token = p_lease_token
  returning true;
$$;

revoke all on function public.acquire_operational_job_lease(text, integer) from public;
revoke all on function public.release_operational_job_lease(text, uuid) from public;
grant execute on function public.acquire_operational_job_lease(text, integer) to service_role;
grant execute on function public.release_operational_job_lease(text, uuid) to service_role;
