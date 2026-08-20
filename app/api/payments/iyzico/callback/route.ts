import { NextRequest, NextResponse } from "next/server";
import { publicSiteUrl } from "../../../../../lib/payments/config";
import { retrieveCheckout } from "../../../../../lib/payments/iyzico";
import { settleCommercePaymentByProviderToken } from "../../../../../lib/payments/settle-commerce-payment";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { iyzicoMoneyToKurus } from "../../../../../lib/validation/payment";

export const runtime = "nodejs";

function failure(reason: string) {
  return NextResponse.redirect(
    `${publicSiteUrl}/odeme/basarisiz?reason=${encodeURIComponent(reason)}`,
    303,
  );
}

function paidSuccessRedirect(orderId: string, reviewRequired = false) {
  return NextResponse.redirect(
    `${publicSiteUrl}/odeme/basarili?order=${orderId}${reviewRequired ? "&review=1" : ""}`,
    303,
  );
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") || "");
  if (!token) return failure("token");

  try {
    const commerce = await settleCommercePaymentByProviderToken(token, { failIfUnpaid: true });
    if (commerce.kind !== "not_found") {
      if (commerce.kind === "error") return failure(commerce.reason);
      if (commerce.kind === "pending") return failure("callback");
      if (commerce.kind === "failed") {
        return NextResponse.redirect(`${publicSiteUrl}/odeme/basarisiz?order=${commerce.orderId}`, 303);
      }
      return paidSuccessRedirect(commerce.orderId, commerce.reviewRequired);
    }

    // Geriye dönük uyumluluk: v22 öncesi tamamlanmamış nfc_orders ödemeleri.
    const admin = getSupabaseAdminClient();
    const { data: attempt } = await admin
      .from("payment_attempts")
      .select("id,order_id,status,amount_kurus,currency,conversation_id,provider_payment_id")
      .eq("provider_token", token)
      .maybeSingle();

    if (!attempt) return failure("attempt");
    if (attempt.status === "PAID") {
      return NextResponse.redirect(`${publicSiteUrl}/odeme/basarili?order=${attempt.order_id}`, 303);
    }

    const result = await retrieveCheckout(token);
    const resultAmount = iyzicoMoneyToKurus(result?.paidPrice ?? result?.price);
    const paid = result?.status === "success"
      && result?.paymentStatus === "SUCCESS"
      && resultAmount === attempt.amount_kurus
      && String(result?.currency || "") === attempt.currency
      && String(result?.basketId || "") === attempt.order_id
      && String(result?.conversationId || "") === attempt.conversation_id;

    await admin.from("payment_attempts").update({
      status: paid ? "PAID" : "FAILED",
      provider_payment_id: result?.paymentId ?? attempt.provider_payment_id ?? null,
      error_code: paid ? null : String(result?.errorCode || "PAYMENT_VERIFICATION_FAILED"),
      error_message: paid ? null : String(result?.errorMessage || "Ödeme doğrulanamadı."),
      raw_result: result,
      updated_at: new Date().toISOString(),
    }).eq("id", attempt.id).neq("status", "PAID");

    await admin.from("nfc_orders").update(
      paid
        ? { payment_status: "PAID", paid_at: new Date().toISOString(), amount_kurus: attempt.amount_kurus }
        : { payment_status: "FAILED" },
    ).eq("id", attempt.order_id).neq("payment_status", "PAID");

    return NextResponse.redirect(
      `${publicSiteUrl}/odeme/${paid ? "basarili" : "basarisiz"}?order=${attempt.order_id}`,
      303,
    );
  } catch (error) {
    console.error("iyzico callback error", error);
    return failure("callback");
  }
}
