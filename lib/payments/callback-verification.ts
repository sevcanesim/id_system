import { iyzicoMoneyToKurus } from "../validation/payment";

export type PaymentAttemptVerificationInput = {
  orderId: string;
  amountKurus: number;
  currency: string;
  conversationId: string;
};

export type IyzicoCheckoutResult = {
  status?: string;
  paymentStatus?: string;
  paidPrice?: string | number;
  price?: string | number;
  currency?: string;
  basketId?: string;
  conversationId?: string;
  paymentId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export function verifyIyzicoCheckoutResult(
  attempt: PaymentAttemptVerificationInput,
  result: IyzicoCheckoutResult | null | undefined,
): boolean {
  if (!result) return false;

  const paidAmountKurus = iyzicoMoneyToKurus(result.paidPrice ?? result.price);

  return result.status === "success"
    && result.paymentStatus === "SUCCESS"
    && paidAmountKurus === attempt.amountKurus
    && String(result.currency || "") === attempt.currency
    && String(result.basketId || "") === attempt.orderId
    && String(result.conversationId || "") === attempt.conversationId;
}

/**
 * Recover must not mark a PENDING attempt FAILED while the shopper is still
 * on 3-D Secure or the retrieve payload is incomplete. Callback (iyzico POST
 * after the form closes) may still treat a non-success result as failed.
 */
export function isTerminalIyzicoDecline(result: IyzicoCheckoutResult | null | undefined): boolean {
  if (!result) return false;
  const paymentStatus = String(result.paymentStatus || "").toUpperCase();
  return paymentStatus === "FAILURE" || paymentStatus === "FAILED";
}
