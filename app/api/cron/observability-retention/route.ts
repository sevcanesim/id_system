import { NextRequest, NextResponse } from "next/server";
import { recordSystemError } from "../../../../lib/observability/system-errors";
import { runWithOperationalJobLease } from "../../../../lib/operations/job-lease";
import { purgeOperationalObservability } from "../../../../lib/operations/observability-retention";
import { authorizeCommerceCron } from "../../../../lib/security/cron-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function execute(request: NextRequest) {
  if (!authorizeCommerceCron(request)) {
    return NextResponse.json({ error: "Cron yetkisi gerekli.", code: "CRON_UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const operation = await runWithOperationalJobLease(
      "observability-retention",
      purgeOperationalObservability,
      (result) => result.systemErrorsDeleted + result.jobRunsDeleted + result.loginEventsDeleted + result.analyticsEventsDeleted,
    );
    return NextResponse.json(operation.acquired ? { ok: true, ...operation.value } : { ok: true, skipped: "LEASE_HELD" });
  } catch {
    void recordSystemError({
      source: "OBSERVABILITY_RETENTION_CRON",
      errorCode: "OBSERVABILITY_RETENTION_FAILED",
      message: "Operational observability retention could not be completed.",
    });
    return NextResponse.json({ error: "Operasyon kayıtları temizlenemedi." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return execute(request);
}

export async function POST(request: NextRequest) {
  return execute(request);
}
