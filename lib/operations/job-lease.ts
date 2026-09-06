import { getSupabaseAdminClient } from "../supabase/server-admin";
import { recordSystemError } from "../observability/system-errors";

type LeaseOutcome<T> =
  | { acquired: false }
  | { acquired: true; value: T; runId: string };

function safeJobErrorCode(error: unknown) {
  if (!(error instanceof Error)) return "OPERATIONAL_JOB_FAILED";
  const code = error.message.trim().toUpperCase().replace(/[^A-Z0-9_:-]/g, "_").slice(0, 120);
  return code || "OPERATIONAL_JOB_FAILED";
}

function validProcessedCount(value: number | undefined) {
  if (!Number.isFinite(value) || value === undefined || value < 0) return null;
  return Math.min(Math.floor(value), 1_000_000);
}

async function finishJobRun(
  runId: string,
  leaseToken: string,
  status: "SUCCEEDED" | "FAILED",
  processedCount: number | undefined,
  errorCode?: string,
) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.rpc("finish_operational_job_run", {
    p_run_id: runId,
    p_lease_token: leaseToken,
    p_status: status,
    p_processed_count: validProcessedCount(processedCount),
    p_error_code: errorCode ?? null,
  });
  if (error) {
    void recordSystemError({
      source: "OPERATIONAL_JOB_RUN",
      errorCode: "JOB_RUN_FINALIZE_FAILED",
      message: "Operational job run history could not be finalized.",
      details: { status },
    });
  }
}

export async function runWithOperationalJobLease<T>(
  jobName: string,
  work: () => Promise<T>,
  processedCount?: (value: T) => number | undefined,
): Promise<LeaseOutcome<T>> {
  const admin = getSupabaseAdminClient();
  const { data: token, error } = await admin.rpc("acquire_operational_job_lease", {
    p_job_name: jobName,
    p_lease_seconds: 600,
  });
  if (error) throw error;
  if (!token || typeof token !== "string") return { acquired: false };

  const { data: runId, error: runError } = await admin.rpc("start_operational_job_run", {
    p_job_name: jobName,
    p_lease_token: token,
  });
  if (runError || !runId || typeof runId !== "string") {
    await admin.rpc("release_operational_job_lease", { p_job_name: jobName, p_lease_token: token });
    throw runError ?? new Error("OPERATIONAL_JOB_RUN_NOT_CREATED");
  }

  try {
    const value = await work();
    await finishJobRun(runId, token, "SUCCEEDED", processedCount?.(value));
    return { acquired: true, value, runId };
  } catch (error) {
    await finishJobRun(runId, token, "FAILED", undefined, safeJobErrorCode(error));
    throw error;
  } finally {
    const { error: releaseError } = await admin.rpc("release_operational_job_lease", {
      p_job_name: jobName,
      p_lease_token: token,
    });
    if (releaseError) {
      void recordSystemError({
        source: "OPERATIONAL_JOB_LEASE",
        errorCode: "LEASE_RELEASE_FAILED",
        message: "Operational job lease could not be released after processing.",
        details: { jobName },
      });
    }
  }
}
