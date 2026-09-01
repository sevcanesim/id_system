import { NextRequest, NextResponse } from "next/server";
import { runCommerceOpsJobs } from "../../../../lib/commerce/commerce-ops-jobs";
import { reconcileAwaitingProviderPayments } from "../../../../lib/commerce/pending-payment-reconciliation";
import { authorizeCommerceCron } from "../../../../lib/security/cron-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function executeCommerceOps(request: NextRequest) {
  if (!authorizeCommerceCron(request)) {
    return NextResponse.json({ error: "Cron yetkisi gerekli.", code: "CRON_UNAUTHORIZED" }, { status: 401 });
  }
  try {
    const providerReconciliation = await reconcileAwaitingProviderPayments();
    const sweep = await runCommerceOpsJobs();
    return NextResponse.json({
      ok: true,
      providerReconciliation,
      abandoned: sweep.abandoned,
      expired: sweep.expired,
      reconciled: sweep.reconciled,
      renewals: sweep.renewals,
      alerts: sweep.alerts,
    });
  } catch (error) {
    console.error("commerce ops cron failed", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "Ticari operasyon işleri çalıştırılamadı." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return executeCommerceOps(request);
}

export async function POST(request: NextRequest) {
  return executeCommerceOps(request);
}
