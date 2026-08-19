import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendOrderReadyEmail } from "../../../../../lib/email/resend";
import { verifyIyzicoCheckoutResult } from "../../../../../lib/payments/callback-verification";
import { publicSiteUrl } from "../../../../../lib/payments/config";
import { retrieveCheckout } from "../../../../../lib/payments/iyzico";
import { getSupabaseAdminClient } from "../../../../../lib/supabase/server-admin";
import { iyzicoMoneyToKurus } from "../../../../../lib/validation/payment";

export const runtime = "nodejs";

function failure(reason: string) {
  return NextResponse.redirect(
    `${publicSiteUrl}/odeme/basarisiz?reason=${encodeURIComponent(reason)}`,
    303,
  );
}

async function autoClaimAuthenticatedOrder(admin: ReturnType<typeof getSupabaseAdminClient>, orderId: string) {
  const { data, error } = await admin.rpc("finalize_authenticated_commerce_order", { p_order_id: orderId });
  const payload = (data as { ok?: boolean; review_required?: boolean; open_issue_count?: number; code?: string } | null) || null;
  const ok = !error && Boolean(payload?.ok);
  if (!ok) {
    console.error("authenticated order auto claim failed", { orderId, error, result: data });
    const { error: issueError } = await admin.rpc("record_commerce_fulfillment_issue", {
      p_order_id: orderId,
      p_order_item_id: null,
      p_issue_code: "AUTHENTICATED_CLAIM_FAILED",
      p_details: { code: payload?.code || null, databaseError: error?.message || null },
    });
    if (issueError) console.error("claim failure reconciliation issue could not be recorded", { orderId, issueError });
  }
  return { ok, reviewRequired: !ok || Boolean(payload?.review_required), openIssueCount: Number(payload?.open_issue_count || 0) };
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
    const admin = getSupabaseAdminClient();
    const { data: commerceAttempt } = await admin
      .from("commerce_payment_attempts")
      .select("id,order_id,status,amount_kurus,currency,conversation_id,provider_payment_id")
      .eq("provider_token", token)
      .maybeSingle();

    if (commerceAttempt) {
      if (commerceAttempt.status === "PAID") {
        const claim = await autoClaimAuthenticatedOrder(admin, commerceAttempt.order_id);
        return paidSuccessRedirect(commerceAttempt.order_id, claim.reviewRequired);
      }

      const result = await retrieveCheckout(token);
      const paid = verifyIyzicoCheckoutResult(
        {
          orderId: commerceAttempt.order_id,
          amountKurus: commerceAttempt.amount_kurus,
          currency: commerceAttempt.currency,
          conversationId: commerceAttempt.conversation_id,
        },
        result,
      );

      const rawActivationToken = randomBytes(32).toString("hex");
      const activationTokenHash = createHash("sha256")
        .update(rawActivationToken)
        .digest("hex");
      const activationExpiresAt = new Date();
      activationExpiresAt.setDate(activationExpiresAt.getDate() + 7);

      const { data: processedRows, error: processError } = await admin.rpc(
        "process_commerce_payment_callback",
        {
          p_attempt_id: commerceAttempt.id,
          p_paid: paid,
          p_provider_payment_id: result?.paymentId ?? commerceAttempt.provider_payment_id ?? null,
          p_error_code: paid ? null : String(result?.errorCode || "PAYMENT_VERIFICATION_FAILED"),
          p_error_message: paid ? null : String(result?.errorMessage || "Ödeme doğrulanamadı."),
          p_raw_result: result,
          p_activation_token_hash: activationTokenHash,
          p_activation_expires_at: activationExpiresAt.toISOString(),
        },
      );

      if (processError) {
        console.error("atomic payment callback failed", {
          attemptId: commerceAttempt.id,
          orderId: commerceAttempt.order_id,
          error: processError,
        });
        return failure("callback");
      }

      const processed = Array.isArray(processedRows) ? processedRows[0] : processedRows;
      if (!processed || processed.outcome === "ATTEMPT_NOT_FOUND") return failure("attempt");

      if (processed.outcome === "FAILED") {
        return NextResponse.redirect(
          `${publicSiteUrl}/odeme/basarisiz?order=${processed.order_id}`,
          303,
        );
      }

      if (processed.outcome === "ALREADY_PAID" || processed.outcome === "PAID_REVIEW_REQUIRED") {
        const claim = await autoClaimAuthenticatedOrder(admin, processed.order_id);
        const reviewRequired = processed.outcome === "PAID_REVIEW_REQUIRED" || claim.reviewRequired;
        return paidSuccessRedirect(processed.order_id, reviewRequired);
      }

      if (processed.outcome !== "PAID_PROCESSED") return failure("callback");

      const claim = await autoClaimAuthenticatedOrder(admin, processed.order_id);
      if (claim.reviewRequired) {
        await admin.from("commerce_email_events").insert({
          order_id: processed.order_id,
          event_type: "ORDER_REVIEW_REQUIRED",
          recipient: processed.guest_email,
          status: "SKIPPED",
          provider_message: `Fulfillment review required (${claim.openIssueCount})`,
        });
        return paidSuccessRedirect(processed.order_id, true);
      }

      const mailResult = await sendOrderReadyEmail({
        to: processed.guest_email,
        orderNumber: processed.order_number,
        createCardUrl: `${publicSiteUrl}/olustur?source=purchase`,
      });

      await admin.from("commerce_email_events").insert({
        order_id: processed.order_id,
        event_type: "ORDER_READY",
        recipient: processed.guest_email,
        status: mailResult.sent ? "SENT" : "SKIPPED",
        provider_message: mailResult.sent ? null : mailResult.reason,
      });

      return paidSuccessRedirect(processed.order_id);
    }

    // Geriye dönük uyumluluk: v22 öncesi tamamlanmamış nfc_orders ödemeleri.
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
