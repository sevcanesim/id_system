import { createHash, randomBytes } from "crypto";
import { loadCommerceOrderKind } from "../commerce/order-kind";
import { COMMERCIAL_PRICING } from "../config/commercial";
import { sendActivationEmail, sendOrderReadyEmail } from "../email/resend";
import { publicSiteUrl } from "./config";
import { CORPORATE_POST_PURCHASE_HREF, INDIVIDUAL_POST_PURCHASE_HREF } from "../commerce/post-purchase";
import { sanitizeProviderPayload } from "./sanitize-provider-payload";
import { getSupabaseAdminClient } from "../supabase/server-admin";

export type CommerceSettleResult =
  | { kind: "not_found" }
  | { kind: "error"; reason: "attempt" | "callback" }
  | { kind: "failed"; orderId: string }
  | { kind: "pending"; orderId: string }
  | { kind: "paid"; orderId: string; reviewRequired: boolean };

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;

type CommerceAttempt = {
  id: string;
  order_id: string;
  provider: string;
  status: string;
  amount_kurus: number;
  currency: string;
  conversation_id: string;
  provider_payment_id: string | null;
};

type VerifiedProviderPayment = {
  paid: boolean;
  providerPaymentId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  rawResult: unknown;
};

async function isGuestCommerceOrder(admin: AdminClient, orderId: string) {
  const { data } = await admin.from("commerce_orders").select("user_id").eq("id", orderId).maybeSingle();
  return !data?.user_id;
}

async function retryCorporatePackageFulfillment(admin: AdminClient, orderId: string) {
  const { error } = await admin.rpc("fulfill_paid_corporate_package_order", { p_order_id: orderId });
  if (error) console.error("corporate package fulfill retry failed", { orderId, message: error.message });
}

async function recoverPaidCommerceOrder(admin: AdminClient, orderId: string) {
  await retryCorporatePackageFulfillment(admin, orderId);
  const flags = await loadCommerceOrderKind(admin, orderId);
  if (await isGuestCommerceOrder(admin, orderId)) {
    return { reviewRequired: flags.reviewRequired, corporate: flags.corporate };
  }
  const claim = await autoClaimAuthenticatedOrder(admin, orderId);
  const afterClaim = await loadCommerceOrderKind(admin, orderId);
  return {
    reviewRequired: afterClaim.reviewRequired || claim.reviewRequired,
    corporate: afterClaim.corporate,
  };
}

async function autoClaimAuthenticatedOrder(admin: AdminClient, orderId: string) {
  const { data, error } = await admin.rpc("finalize_authenticated_commerce_order", { p_order_id: orderId });
  const payload = (data as { ok?: boolean; review_required?: boolean; open_issue_count?: number; code?: string } | null) || null;
  // Guest checkout is first-class: ACCOUNT_REQUIRED means "claim by email", not a fulfillment defect.
  if (payload?.code === "ACCOUNT_REQUIRED") {
    return { ok: true, reviewRequired: false, openIssueCount: 0 };
  }
  const ok = !error && Boolean(payload?.ok);
  if (!ok) {
    console.error("authenticated order auto claim failed", { orderId, message: error?.message || null, code: payload?.code || null });
    const { error: issueError } = await admin.rpc("record_commerce_fulfillment_issue", {
      p_order_id: orderId,
      p_order_item_id: null,
      p_issue_code: "AUTHENTICATED_CLAIM_FAILED",
      p_details: { code: payload?.code || null, databaseError: error?.message || null },
    });
    if (issueError) console.error("claim failure reconciliation issue could not be recorded", { orderId, message: issueError.message });
  }
  return { ok, reviewRequired: !ok || Boolean(payload?.review_required), openIssueCount: Number(payload?.open_issue_count || 0) };
}

async function sendGuestActivationIfTokenPersisted(
  admin: AdminClient,
  input: { orderId: string; guestEmail: string | null; orderNumber: string; rawActivationToken: string; corporate: boolean },
) {
  if (!input.guestEmail) {
    console.error("guest activation email skipped: missing recipient", { orderId: input.orderId });
    return;
  }
  const tokenHash = createHash("sha256").update(input.rawActivationToken).digest("hex");
  const { data: storedToken } = await admin
    .from("activation_tokens")
    .select("id")
    .eq("order_id", input.orderId)
    .eq("token_hash", tokenHash)
    .is("used_at", null)
    .is("invalidated_at", null)
    .maybeSingle();
  if (!storedToken) return;

  const hoursValid = COMMERCIAL_PRICING.SERVICE.activationLinkDays * 24;
  const mailResult = await sendActivationEmail({
    to: input.guestEmail,
    orderNumber: input.orderNumber,
    hoursValid,
    audience: input.corporate ? "corporate" : "individual",
    activationUrl: `${publicSiteUrl}/aktivasyon?token=${encodeURIComponent(input.rawActivationToken)}`,
  });
  await admin.from("commerce_email_events").insert({
    order_id: input.orderId,
    event_type: "ACTIVATION",
    recipient: input.guestEmail,
    status: mailResult.sent ? "SENT" : "SKIPPED",
    provider_message: mailResult.sent ? null : mailResult.reason,
  });
}

async function finishPaidOrder(
  admin: AdminClient,
  processed: { order_id: string; guest_email: string | null; order_number: string; outcome: string },
  rawActivationToken: string,
): Promise<CommerceSettleResult> {
  const flags = await loadCommerceOrderKind(admin, processed.order_id);
  if (await isGuestCommerceOrder(admin, processed.order_id)) {
    if (processed.outcome === "PAID_PROCESSED" || processed.outcome === "PAID_REVIEW_REQUIRED") {
      await sendGuestActivationIfTokenPersisted(admin, {
        orderId: processed.order_id,
        guestEmail: processed.guest_email,
        orderNumber: processed.order_number,
        rawActivationToken,
        corporate: flags.corporate,
      });
    }
    return {
      kind: "paid",
      orderId: processed.order_id,
      reviewRequired: processed.outcome === "PAID_REVIEW_REQUIRED" || flags.reviewRequired,
    };
  }

  const claim = await autoClaimAuthenticatedOrder(admin, processed.order_id);
  const afterClaim = await loadCommerceOrderKind(admin, processed.order_id);
  const reviewRequired = processed.outcome === "PAID_REVIEW_REQUIRED" || claim.reviewRequired || afterClaim.reviewRequired;
  if (processed.outcome === "PAID_PROCESSED" && claim.reviewRequired) {
    await admin.from("commerce_email_events").insert({
      order_id: processed.order_id,
      event_type: "ORDER_REVIEW_REQUIRED",
      recipient: processed.guest_email,
      status: "SKIPPED",
      provider_message: `Fulfillment review required (${claim.openIssueCount})`,
    });
    return { kind: "paid", orderId: processed.order_id, reviewRequired: true };
  }

  if (processed.outcome === "PAID_PROCESSED" && !reviewRequired && processed.guest_email) {
    const mailResult = await sendOrderReadyEmail({
      to: processed.guest_email,
      orderNumber: processed.order_number,
      audience: afterClaim.corporate ? "corporate" : "individual",
      createCardUrl: afterClaim.corporate
        ? `${publicSiteUrl}${CORPORATE_POST_PURCHASE_HREF}`
        : `${publicSiteUrl}${INDIVIDUAL_POST_PURCHASE_HREF}`,
    });
    await admin.from("commerce_email_events").insert({
      order_id: processed.order_id,
      event_type: "ORDER_READY",
      recipient: processed.guest_email,
      status: mailResult.sent ? "SENT" : "SKIPPED",
      provider_message: mailResult.sent ? null : mailResult.reason,
    });
  }

  return { kind: "paid", orderId: processed.order_id, reviewRequired };
}

async function settleVerifiedProviderPayment(
  admin: AdminClient,
  commerceAttempt: CommerceAttempt,
  verification: VerifiedProviderPayment,
): Promise<CommerceSettleResult> {
  if (commerceAttempt.status === "PAID") {
    const recovered = await recoverPaidCommerceOrder(admin, commerceAttempt.order_id);
    return { kind: "paid", orderId: commerceAttempt.order_id, reviewRequired: recovered.reviewRequired };
  }

  const rawActivationToken = randomBytes(32).toString("hex");
  const activationTokenHash = createHash("sha256").update(rawActivationToken).digest("hex");
  const activationExpiresAt = new Date();
  activationExpiresAt.setDate(activationExpiresAt.getDate() + 7);

  const { data: processedRows, error: processError } = await admin.rpc("process_commerce_payment_callback", {
    p_attempt_id: commerceAttempt.id,
    p_paid: verification.paid,
    p_provider_payment_id: verification.providerPaymentId ?? commerceAttempt.provider_payment_id ?? null,
    p_error_code: verification.paid ? null : verification.errorCode || "PAYMENT_VERIFICATION_FAILED",
    p_error_message: verification.paid ? null : verification.errorMessage || "Ödeme doğrulanamadı.",
    p_raw_result: sanitizeProviderPayload(verification.rawResult),
    p_activation_token_hash: activationTokenHash,
    p_activation_expires_at: activationExpiresAt.toISOString(),
  });

  if (processError) {
    console.error("atomic payment callback failed", {
      attemptId: commerceAttempt.id,
      orderId: commerceAttempt.order_id,
      message: processError.message,
    });
    if (verification.paid) {
      const { error: issueError } = await admin.rpc("record_commerce_fulfillment_issue", {
        p_order_id: commerceAttempt.order_id,
        p_order_item_id: null,
        p_issue_code: "PAYMENT_CALLBACK_COMMIT_FAILED",
        p_details: { attemptId: commerceAttempt.id, databaseError: processError.message },
      });
      if (issueError) {
        console.error("callback commit issue could not be recorded", {
          orderId: commerceAttempt.order_id,
          message: issueError.message,
        });
      }
    }
    return { kind: "error", reason: "callback" };
  }

  const processed = Array.isArray(processedRows) ? processedRows[0] : processedRows;
  if (!processed || processed.outcome === "ATTEMPT_NOT_FOUND") return { kind: "error", reason: "attempt" };
  if (processed.outcome === "FAILED") return { kind: "failed", orderId: processed.order_id };

  if (processed.outcome === "ALREADY_PAID" || processed.outcome === "PAID_REVIEW_REQUIRED" || processed.outcome === "PAID_PROCESSED") {
    return finishPaidOrder(admin, processed, rawActivationToken);
  }

  return { kind: "error", reason: "callback" };
}

export async function settleCommercePaymentByPaytrCallback(input: {
  merchantOid: string;
  paid: boolean;
  totalAmountKurus: number;
  status: string;
  errorCode?: string | null;
  errorMessage?: string | null;
}) : Promise<CommerceSettleResult> {
  const admin = getSupabaseAdminClient();
  const { data: commerceAttempt } = await admin
    .from("commerce_payment_attempts")
    .select("id,order_id,provider,status,amount_kurus,currency,conversation_id,provider_payment_id,provider_token")
    .eq("provider_token", input.merchantOid)
    .eq("provider", "PAYTR")
    .maybeSingle();

  if (!commerceAttempt) return { kind: "not_found" };
  if (commerceAttempt.amount_kurus !== input.totalAmountKurus) return { kind: "error", reason: "callback" };
  return settleVerifiedProviderPayment(admin, commerceAttempt, {
    paid: input.paid,
    providerPaymentId: input.merchantOid,
    errorCode: input.paid ? null : input.errorCode || "PAYTR_PAYMENT_FAILED",
    errorMessage: input.paid ? null : input.errorMessage || "Ödeme doğrulanamadı.",
    rawResult: {
      provider: "PAYTR",
      merchantOid: input.merchantOid,
      status: input.status,
      totalAmount: input.totalAmountKurus,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
    },
  });
}
