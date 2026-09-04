import { NextRequest, NextResponse } from "next/server";
import { deliverOrganizationWebhookJobs } from "../../../../lib/organizations/webhook-integrations";
import { authorizeCommerceCron } from "../../../../lib/security/cron-authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function execute(request: NextRequest) {
  if (!authorizeCommerceCron(request)) return NextResponse.json({ error: "Cron yetkisi gerekli.", code: "CRON_UNAUTHORIZED" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await deliverOrganizationWebhookJobs()) });
  } catch (error) {
    console.error("organization integration cron failed", error instanceof Error ? error.message : "UNKNOWN");
    return NextResponse.json({ error: "Entegrasyon teslimat kuyruğu çalıştırılamadı." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) { return execute(request); }
export async function POST(request: NextRequest) { return execute(request); }
