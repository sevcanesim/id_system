import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationRole } from "../../../../lib/organizations/authorization";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

type CorporateOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalKurus: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  items: Array<{ id: string; name: string; quantity: number; unitPriceKurus: number }>;
  invoice: { status: string; number: string | null; documentUrl: string | null; issuedAt: string | null } | null;
};

/**
 * Corporate billing data is deliberately not exposed through the ordinary
 * customer-order endpoint. Its authorization boundary is company scope and
 * the OWNER/HR roles, not the purchaser's personal account id.
 */
export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });

  const actor = await requireOrganizationRole(request, organizationId, ["OWNER", "HR"]);
  if (!actor) return NextResponse.json({ error: "Satın alma ve fatura geçmişi yalnız Şirket Sahibi ile İK tarafından görüntülenebilir." }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("commerce_order_items")
    .select("id,product_name,quantity,unit_price_kurus,configuration,commerce_orders!inner(id,order_number,status,total_kurus,currency,paid_at,created_at,commerce_invoice_jobs(status,provider_invoice_number,provider_document_url,issued_at))")
    .contains("configuration", { organizationId });

  if (error) {
    console.error("organization commerce history query failed", { organizationId, code: error.code });
    return NextResponse.json({ error: "Satın alma geçmişi şu anda yüklenemedi." }, { status: 503 });
  }

  const byOrder = new Map<string, CorporateOrder>();

  for (const row of data || []) {
    const order = Array.isArray(row.commerce_orders) ? row.commerce_orders[0] : row.commerce_orders;
    if (!order) continue;
    const invoiceValue = Array.isArray(order.commerce_invoice_jobs)
      ? order.commerce_invoice_jobs[0]
      : order.commerce_invoice_jobs;
    const current: CorporateOrder = byOrder.get(order.id) || {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      totalKurus: Number(order.total_kurus),
      currency: order.currency,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      items: [],
      invoice: invoiceValue
        ? {
            status: invoiceValue.status,
            number: invoiceValue.provider_invoice_number,
            documentUrl: invoiceValue.provider_document_url,
            issuedAt: invoiceValue.issued_at,
          }
        : null,
    };
    current.items.push({
      id: row.id,
      name: row.product_name,
      quantity: row.quantity,
      unitPriceKurus: Number(row.unit_price_kurus),
    });
    byOrder.set(order.id, current);
  }

  const orders = [...byOrder.values()].sort((left, right) =>
    new Date(right.paidAt || right.createdAt).getTime() - new Date(left.paidAt || left.createdAt).getTime(),
  );
  return NextResponse.json({ orders });
}
