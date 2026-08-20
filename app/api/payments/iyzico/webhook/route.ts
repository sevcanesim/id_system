import { NextRequest, NextResponse } from "next/server";
import { settleCommercePaymentByProviderToken } from "../../../../../lib/payments/settle-commerce-payment";

export const runtime = "nodejs";

async function readToken(request: NextRequest): Promise<string> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({})) as { token?: unknown; iyziPaymentId?: unknown };
    return String(body.token || body.iyziPaymentId || "");
  }
  const form = await request.formData().catch(() => null);
  if (!form) return "";
  return String(form.get("token") || form.get("iyziPaymentId") || "");
}

/**
 * iyzico merchant notification when the shopper closes the checkout tab
 * before the browser callback POST. Same settlement path as recover/callback;
 * failIfUnpaid is false so an in-flight form is not marked FAILED.
 */
export async function POST(request: NextRequest) {
  try {
    const token = await readToken(request);
    if (!token) return NextResponse.json({ ok: false, error: "token" }, { status: 400 });
    const result = await settleCommercePaymentByProviderToken(token, { failIfUnpaid: false });
    if (result.kind === "not_found") return NextResponse.json({ ok: false, error: "attempt" }, { status: 404 });
    if (result.kind === "error") return NextResponse.json({ ok: false, error: result.reason }, { status: 500 });
    return NextResponse.json({
      ok: true,
      paid: result.kind === "paid",
      pending: result.kind === "pending",
      failed: result.kind === "failed",
      orderId: result.orderId,
    });
  } catch (error) {
    console.error("iyzico webhook error", error);
    return NextResponse.json({ ok: false, error: "webhook" }, { status: 500 });
  }
}
