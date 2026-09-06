import { NextRequest, NextResponse } from "next/server";
import { deliverOrganizationWebhookJobs } from "../../../../lib/organizations/webhook-integrations";
import { recordSystemError } from "../../../../lib/observability/system-errors";
import { runWithOperationalJobLease } from "../../../../lib/operations/job-lease";
import { authorizeCommerceCron } from "../../../../lib/security/cron-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function execute(request: NextRequest) {
  if (!authorizeCommerceCron(request)) return NextResponse.json({ error: "Cron yetkisi gerekli.", code: "CRON_UNAUTHORIZED" }, { status: 401 });
  try {
    const delivery = await runWithOperationalJobLease(
      "organization-webhooks",
      () => deliverOrganizationWebhookJobs(),
      (result) => result.inspected,
    );
    return NextResponse.json(delivery.acquired ? { ok: true, ...delivery.value } : { ok: true, skipped: "LEASE_HELD" });
  } catch {
    void recordSystemError({
      source: "ORGANIZATION_WEBHOOK_CRON",
      errorCode: "WEBHOOK_DELIVERY_RUN_FAILED",
      message: "Organization webhook delivery worker failed before completing its run.",
    });
    return NextResponse.json({ error: "Entegrasyon teslimat kuyruğu çalıştırılamadı." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { return execute(request); }
export async function POST(request: NextRequest) { return execute(request); }
