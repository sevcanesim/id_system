import { NextRequest, NextResponse } from "next/server";
import { isPaytrConfigured } from "../../../../../lib/payments/config";
import { verifyPaytrCallbackHash } from "../../../../../lib/payments/paytr";
import { settleCommercePaymentByPaytrCallback } from "../../../../../lib/payments/settle-commerce-payment";

export const runtime = "nodejs";

function callbackOk() {
  return new NextResponse("OK", {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

/**
 * PayTR retries a callback until it receives the literal `OK`. Do not turn an
 * order into PAID from a browser redirect: this signed server callback is the
 * only PayTR payment authority.
 */
export async function POST(request: NextRequest) {
  if (!isPaytrConfigured) {
    return new NextResponse("PAYTR_NOT_CONFIGURED", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const payload = await request.formData();
    const merchantOid = String(payload.get("merchant_oid") || "").trim();
    const status = String(payload.get("status") || "").trim().toLowerCase();
    const totalAmount = String(payload.get("total_amount") || "").trim();
    const hash = String(payload.get("hash") || "").trim();
    const paid = status === "success";

    if (
      !/^PT[A-Za-z0-9]{20,80}$/.test(merchantOid)
      || !["success", "failed"].includes(status)
      || !verifyPaytrCallbackHash({ merchantOid, status, totalAmount, hash })
    ) {
      // This deliberately omits all incoming values. They may include payment
      // or customer data and must not end up in application logs.
      console.error("PayTR callback rejected: signature or payload is invalid");
      return new NextResponse("INVALID_CALLBACK", { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const totalAmountKurus = Number(totalAmount);
    if (!Number.isSafeInteger(totalAmountKurus) || totalAmountKurus < 1) {
      console.error("PayTR callback rejected: amount is invalid");
      return new NextResponse("INVALID_CALLBACK", { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const result = await settleCommercePaymentByPaytrCallback({
      merchantOid,
      paid,
      totalAmountKurus,
      status,
      // Provider-supplied failure details are untrusted and are not persisted;
      // they can contain details that do not belong in our audit records.
      errorCode: paid ? null : "PAYTR_PAYMENT_FAILED",
      errorMessage: paid ? null : "Ödeme sağlayıcısı işlemi doğrulamadı.",
    });

    if (result.kind === "not_found" || result.kind === "error") {
      // A non-OK response causes PayTR to retry; never acknowledge a callback
      // whose corresponding payment could not be atomically recorded.
      return new NextResponse("CALLBACK_RETRY", { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    return callbackOk();
  } catch {
    console.error("PayTR callback processing failed");
    return new NextResponse("CALLBACK_RETRY", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
