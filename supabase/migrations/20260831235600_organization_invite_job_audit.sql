create table if not exists public.organization_invite_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'RUNNING' check (status in ('RUNNING','COMPLETED','COMPLETED_WITH_AUDIT_ERRORS','FAILED')),
  total_rows integer not null check (total_rows > 0),
  created_count integer not null default 0 check (created_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  mail_failed_count integer not null default 0 check (mail_failed_count >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.organization_invite_logs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.organization_invite_jobs(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  email text not null,
  result_status text not null check (result_status in ('CREATED','ERROR')),
  error_code text,
  error_message text,
  member_id uuid references public.organization_members(id) on delete set null,
  email_sent boolean,
  created_at timestamptz not null default now(),
  unique(job_id, row_number)
);

create index if not exists organization_invite_jobs_org_created_idx
  on public.organization_invite_jobs(organization_id, created_at desc);
create index if not exists organization_invite_logs_job_status_idx
  on public.organization_invite_logs(job_id, result_status, row_number);

alter table public.organization_invite_jobs enable row level security;
alter table public.organization_invite_logs enable row level security;

revoke all on public.organization_invite_jobs from anon, authenticated;
revoke all on public.organization_invite_logs from anon, authenticated;
grant all on public.organization_invite_jobs to service_role;
grant all on public.organization_invite_logs to service_role;

comment on table public.organization_invite_jobs is 'Durable ledger for CSV bulk invitation operations.';
comment on table public.organization_invite_logs is 'Row-level immutable outcomes for a bulk invitation job.';
