import { NextRequest, NextResponse } from "next/server";
import { runCommerceOpsJobs, runIsolatedCommerceOperation } from "../../../../lib/commerce/commerce-ops-jobs";
import { reconcileAwaitingProviderPayments } from "../../../../lib/commerce/pending-payment-reconciliation";
import { recordSystemError } from "../../../../lib/observability/system-errors";
import { runWithOperationalJobLease } from "../../../../lib/operations/job-lease";
import { authorizeCommerceCron } from "../../../../lib/security/cron-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function executeCommerceOps(request: NextRequest) {
  if (!authorizeCommerceCron(request)) {
    return NextResponse.json({ error: "Cron yetkisi gerekli.", code: "CRON_UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const operation = await runWithOperationalJobLease("commerce-ops", async () => {
      const [providerReconciliation, sweep] = await Promise.all([
        runIsolatedCommerceOperation("PROVIDER_RECONCILIATION", () => reconcileAwaitingProviderPayments(), { scanned: 0, released: 0, errors: 0 }),
        runCommerceOpsJobs(),
      ]);
      return { providerReconciliation, sweep };
    }, ({ providerReconciliation, sweep }) => {
      const reconciled = typeof providerReconciliation.scanned === "number" ? providerReconciliation.scanned : 0;
      return reconciled + sweep.abandoned.scanned + sweep.alerts.open + sweep.corporateLeads.inspected;
    });
    if (!operation.acquired) return NextResponse.json({ ok: true, skipped: "LEASE_HELD" });
    const { providerReconciliation, sweep } = operation.value;
    return NextResponse.json({
      ok: true,
      providerReconciliation,
      abandoned: sweep.abandoned,
      expired: sweep.expired,
      reconciled: sweep.reconciled,
      renewals: sweep.renewals,
      alerts: sweep.alerts,
      corporateLeads: sweep.corporateLeads,
      checkoutPrivacy: sweep.checkoutPrivacy,
      networkingPrivacy: sweep.networkingPrivacy,
    });
  } catch {
    void recordSystemError({
      source: "COMMERCE_OPS_CRON",
      errorCode: "COMMERCE_OPS_RUN_FAILED",
      message: "Commerce operations worker failed before completing its run.",
    });
    return NextResponse.json({ error: "Ticari operasyon işleri çalıştırılamadı." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return executeCommerceOps(request);
}

export async function POST(request: NextRequest) {
  return executeCommerceOps(request);
}
