import { getSupabaseAdminClient } from "../supabase/server-admin";

export type ObservabilityRetentionResult = {
  systemErrorsDeleted: number;
  jobRunsDeleted: number;
  loginEventsDeleted: number;
  analyticsEventsDeleted: number;
  errorRetentionDays: number;
  jobRunRetentionDays: number;
};

function isRetentionResult(value: unknown): value is ObservabilityRetentionResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Record<string, unknown>;
  return [
    result.systemErrorsDeleted,
    result.jobRunsDeleted,
    result.loginEventsDeleted,
    result.analyticsEventsDeleted,
    result.errorRetentionDays,
    result.jobRunRetentionDays,
  ].every((entry) => typeof entry === "number" && Number.isFinite(entry) && entry >= 0);
}

export async function purgeOperationalObservability() {
  const admin = getSupabaseAdminClient();
  const [operationalResult, loginResult, analyticsResult] = await Promise.all([
    admin.rpc("purge_operational_observability", {
      p_error_retention_days: 90,
      p_job_run_retention_days: 180,
    }),
    admin.rpc("purge_auth_login_events", { p_retention_days: 90 }),
    admin.rpc("purge_card_view_events", { p_retention_days: 90 }),
  ]);

  if (operationalResult.error) throw operationalResult.error;
  if (loginResult.error) throw loginResult.error;
  if (analyticsResult.error) throw analyticsResult.error;
  if (!isRetentionResult({ ...operationalResult.data, loginEventsDeleted: loginResult.data, analyticsEventsDeleted: analyticsResult.data })) {
    throw new Error("OBSERVABILITY_RETENTION_RESULT_INVALID");
  }
  return { ...operationalResult.data, loginEventsDeleted: loginResult.data, analyticsEventsDeleted: analyticsResult.data };
}
