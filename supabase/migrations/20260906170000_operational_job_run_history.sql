create table if not exists public.operational_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null check (job_name ~ '^[a-z0-9:_-]{1,120}$'),
  lease_token uuid not null,
  status text not null check (status in ('RUNNING', 'SUCCEEDED', 'FAILED')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  processed_count integer,
  error_code text check (error_code is null or error_code ~ '^[A-Z0-9_:-]{1,120}$')
);

create index if not exists operational_job_runs_job_started_at_idx
  on public.operational_job_runs (job_name, started_at desc);

create index if not exists operational_job_runs_open_idx
  on public.operational_job_runs (status, started_at)
  where status = 'RUNNING';

alter table public.operational_job_runs enable row level security;
revoke all on public.operational_job_runs from anon, authenticated, public;
grant all on public.operational_job_runs to service_role;

create or replace function public.start_operational_job_run(
  p_job_name text,
  p_lease_token uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run_id uuid;
begin
  if p_job_name !~ '^[a-z0-9:_-]{1,120}$' then
    raise exception 'INVALID_OPERATIONAL_JOB_NAME';
  end if;

  if not exists (
    select 1
    from public.operational_job_leases
    where job_name = p_job_name
      and lease_token = p_lease_token
      and lease_expires_at > now()
  ) then
    raise exception 'OPERATIONAL_JOB_LEASE_NOT_HELD';
  end if;

  insert into public.operational_job_runs (job_name, lease_token, status)
  values (p_job_name, p_lease_token, 'RUNNING')
  returning id into v_run_id;

  return v_run_id;
end;
$$;

create or replace function public.finish_operational_job_run(
  p_run_id uuid,
  p_lease_token uuid,
  p_status text,
  p_processed_count integer default null,
  p_error_code text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('SUCCEEDED', 'FAILED') then
    raise exception 'INVALID_OPERATIONAL_JOB_STATUS';
  end if;

  if p_processed_count is not null and (p_processed_count < 0 or p_processed_count > 1000000) then
    raise exception 'INVALID_OPERATIONAL_JOB_PROCESSED_COUNT';
  end if;

  update public.operational_job_runs
  set
    status = p_status,
    finished_at = now(),
    processed_count = p_processed_count,
    error_code = case when p_error_code ~ '^[A-Z0-9_:-]{1,120}$' then p_error_code else null end
  where id = p_run_id
    and lease_token = p_lease_token
    and status = 'RUNNING';

  return found;
end;
$$;

revoke all on function public.start_operational_job_run(text, uuid) from public;
revoke all on function public.finish_operational_job_run(uuid, uuid, text, integer, text) from public;
grant execute on function public.start_operational_job_run(text, uuid) to service_role;
grant execute on function public.finish_operational_job_run(uuid, uuid, text, integer, text) to service_role;
