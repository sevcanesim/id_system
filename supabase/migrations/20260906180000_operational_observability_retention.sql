create or replace function public.purge_operational_observability(
  p_error_retention_days integer default 90,
  p_job_run_retention_days integer default 180
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_errors_deleted integer := 0;
  v_runs_deleted integer := 0;
begin
  if p_error_retention_days < 30 or p_error_retention_days > 365
    or p_job_run_retention_days < 90 or p_job_run_retention_days > 730 then
    raise exception 'INVALID_OBSERVABILITY_RETENTION';
  end if;

  delete from public.system_error_logs
  where occurred_at < now() - make_interval(days => p_error_retention_days);
  get diagnostics v_errors_deleted = row_count;

  delete from public.operational_job_runs
  where coalesce(finished_at, started_at) < now() - make_interval(days => p_job_run_retention_days)
    and status <> 'RUNNING';
  get diagnostics v_runs_deleted = row_count;

  return jsonb_build_object(
    'systemErrorsDeleted', v_errors_deleted,
    'jobRunsDeleted', v_runs_deleted,
    'errorRetentionDays', p_error_retention_days,
    'jobRunRetentionDays', p_job_run_retention_days
  );
end;
$$;

revoke all on function public.purge_operational_observability(integer, integer) from public, anon, authenticated;
grant execute on function public.purge_operational_observability(integer, integer) to service_role;
