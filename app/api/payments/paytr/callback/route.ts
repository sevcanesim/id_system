import { NextRequest, NextResponse } from "next/server";
import { isPaytrConfigured } from "../../../../../lib/payments/config";
import {
  paytrFailureCode,
  verifyPaytrCallbackHash,
} from "../../../../../lib/payments/paytr";
import { settleCommercePaymentByPaytrCallback } from "../../../../../lib/payments/settle-commerce-payment";
import { finalizePaytrCallbackReceipt, recordPaytrCallbackReceived } from "../../../../../lib/payments/payment-callback-receipts";
import { recordSystemError } from "../../../../../lib/observability/system-errors";

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
  const requestId = request.headers.get("x-request-id");
  if (!isPaytrConfigured) {
    void recordSystemError({ source: "PAYTR_CALLBACK", errorCode: "PAYTR_NOT_CONFIGURED", message: "PayTR callback received while provider configuration is unavailable.", requestId });
    return new NextResponse("PAYTR_NOT_CONFIGURED", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const payload = await request.formData();
    const merchantOid = String(payload.get("merchant_oid") || "").trim();
    const status = String(payload.get("status") || "").trim().toLowerCase();
    const totalAmount = String(payload.get("total_amount") || "").trim();
    const hash = String(payload.get("hash") || "").trim();
    const paid = status === "success";
    const failureCode = paid
      ? null
      : paytrFailureCode(payload.get("failed_reason_code"));

    if (
      !/^PT[A-Za-z0-9]{20,80}$/.test(merchantOid)
      || !["success", "failed"].includes(status)
      || !verifyPaytrCallbackHash({ merchantOid, status, totalAmount, hash })
    ) {
      // This deliberately omits all incoming values. They may include payment
      // or customer data and must not end up in application logs.
      void recordSystemError({ source: "PAYTR_CALLBACK", errorCode: "PAYTR_INVALID_CALLBACK", message: "PayTR callback signature or payload validation failed.", requestId });
      return new NextResponse("INVALID_CALLBACK", { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const totalAmountKurus = Number(totalAmount);
    if (!Number.isSafeInteger(totalAmountKurus) || totalAmountKurus < 1) {
      void recordSystemError({ source: "PAYTR_CALLBACK", errorCode: "PAYTR_INVALID_AMOUNT", message: "PayTR callback amount validation failed.", requestId });
      return new NextResponse("INVALID_CALLBACK", { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    const providerReferenceHash = await recordPaytrCallbackReceived({ merchantOid, amountKurus: totalAmountKurus });

    const result = await settleCommercePaymentByPaytrCallback({
      merchantOid,
      paid,
      totalAmountKurus,
      status,
      errorCode: failureCode,
      errorMessage: paid ? null : "Ödeme sağlayıcısı işlemi doğrulamadı.",
    });

    if (result.kind === "not_found" || result.kind === "error") {
      await finalizePaytrCallbackReceipt({
        providerReferenceHash,
        status: "RETRYING",
        errorCode: result.kind === "not_found" ? "PAYTR_ATTEMPT_NOT_FOUND" : `PAYTR_${result.reason.toUpperCase()}_ERROR`,
      });
      void recordSystemError({
        source: "PAYTR_CALLBACK",
        errorCode: result.kind === "not_found" ? "PAYTR_ATTEMPT_NOT_FOUND" : `PAYTR_${result.reason.toUpperCase()}_ERROR`,
        message: "PayTR callback could not be committed and will be retried by the provider.",
        requestId,
        details: { providerReferenceHash },
      });
      // A non-OK response causes PayTR to retry; never acknowledge a callback
      // whose corresponding payment could not be atomically recorded.
      return new NextResponse("CALLBACK_RETRY", { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    await finalizePaytrCallbackReceipt({
      providerReferenceHash,
      status: "PROCESSED",
      orderId: result.orderId,
      errorCode: result.kind === "failed" ? failureCode : null,
    });

    return callbackOk();
  } catch {
    void recordSystemError({ source: "PAYTR_CALLBACK", errorCode: "PAYTR_CALLBACK_PROCESSING_FAILED", message: "PayTR callback processing failed before a durable acknowledgment.", requestId });
    return new NextResponse("CALLBACK_RETRY", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
