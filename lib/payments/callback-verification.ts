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
