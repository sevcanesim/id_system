import { NextRequest, NextResponse } from "next/server";
import { publicSiteUrl } from "../../../../../lib/payments/config";
import { retrieveCheckout } from "../../../../../lib/payments/iyzico";
import { settleCommercePaymentByProviderToken } from "../../../../../lib/payments/settle-commerce-payment";
import { sanitizeProviderPayload } from "../../../../../lib/payments/sanitize-provider-payload";
import { verifyIyzicoCheckoutResult } from "../../../../../lib/payments/callback-verification";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";

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

async function recoverVerifiedPaidCallback(token: string) {
  const admin = getSupabaseAdminClient();
  const { data: attempt } = await admin
    .from("commerce_payment_attempts")
    .select("id,order_id,amount_kurus,currency,conversation_id")
    .eq("provider_token", token)
    .maybeSingle();
  if (!attempt) return null;

  const result = await retrieveCheckout(token);
  const paid = verifyIyzicoCheckoutResult(
    {
      orderId: attempt.order_id,
      amountKurus: attempt.amount_kurus,
      currency: attempt.currency,
      conversationId: attempt.conversation_id,
    },
    result,
  );
  if (!paid) return null;

  const { error: issueError } = await admin.rpc("record_commerce_fulfillment_issue", {
    p_order_id: attempt.order_id,
    p_order_item_id: null,
    p_issue_code: "PAYMENT_CALLBACK_COMMIT_FAILED",
    p_details: {
      attemptId: attempt.id,
      recoverySource: "callback-route",
      providerPaymentId: result?.paymentId ?? null,
    },
  });
  if (issueError) {
    console.error("verified paid callback issue could not be recorded", {
      orderId: attempt.order_id,
      message: issueError.message,
    });
  }

  return attempt.order_id;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const token = String(form.get("token") || "");
  if (!token) return failure("token");

  try {
    const commerce = await settleCommercePaymentByProviderToken(token, { failIfUnpaid: true });
    if (commerce.kind !== "not_found") {
      if (commerce.kind === "error") {
        if (commerce.reason === "callback") {
          const recoveredOrderId = await recoverVerifiedPaidCallback(token);
          if (recoveredOrderId) return paidSuccessRedirect(recoveredOrderId, true);
        }
        return failure(commerce.reason);
      }
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
    const paid = verifyIyzicoCheckoutResult(
      {
        orderId: attempt.order_id,
        amountKurus: attempt.amount_kurus,
        currency: attempt.currency,
        conversationId: attempt.conversation_id,
      },
      result,
    );

    await admin.from("payment_attempts").update({
      status: paid ? "PAID" : "FAILED",
      provider_payment_id: result?.paymentId ?? attempt.provider_payment_id ?? null,
      error_code: paid ? null : String(result?.errorCode || "PAYMENT_VERIFICATION_FAILED"),
      error_message: paid ? null : String(result?.errorMessage || "Ödeme doğrulanamadı."),
      raw_result: sanitizeProviderPayload(result),
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
    console.error("iyzico callback error", error instanceof Error ? error.message : "UNKNOWN");
    return failure("callback");
  }
}
