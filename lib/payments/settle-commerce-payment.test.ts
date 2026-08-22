import { afterEach, describe, expect, it, vi } from "vitest";

const retrieveCheckout = vi.hoisted(() => vi.fn());
const sendActivationEmail = vi.hoisted(() => vi.fn());
const sendOrderReadyEmail = vi.hoisted(() => vi.fn());
const loadCommerceOrderKind = vi.hoisted(() => vi.fn());
const admin = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("./iyzico", () => ({ retrieveCheckout }));
vi.mock("../email/resend", () => ({ sendActivationEmail, sendOrderReadyEmail }));
vi.mock("../commerce/order-kind", () => ({ loadCommerceOrderKind }));
vi.mock("../supabase/server-admin", () => ({ getSupabaseAdminClient: () => admin }));
vi.mock("./config", () => ({ publicSiteUrl: "https://yenomi.test" }));

import { settleCommercePaymentByProviderToken } from "./settle-commerce-payment";

const ATTEMPT = {
  id: "attempt-1",
  order_id: "order-1",
  status: "PENDING",
  amount_kurus: 79900,
  currency: "TRY",
  conversation_id: "conv-1",
  provider_payment_id: null,
  provider_token: "token-1",
};

const PAID_RESULT = {
  status: "success",
  paymentStatus: "SUCCESS",
  paidPrice: "799.00",
  currency: "TRY",
  basketId: "order-1",
  conversationId: "conv-1",
  paymentId: "pay-1",
};

function chain(data: unknown) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  builder.select = self;
  builder.eq = self;
  builder.is = self;
  builder.not = self;
  builder.order = self;
  builder.limit = self;
  builder.maybeSingle = vi.fn(async () => ({ data, error: null }));
  builder.insert = vi.fn(async () => ({ data: null, error: null }));
  return builder;
}

function mockFrom(tables: Record<string, unknown>) {
  admin.from.mockImplementation((table: string) => chain(tables[table] ?? null));
}

afterEach(() => {
  vi.clearAllMocks();
  loadCommerceOrderKind.mockResolvedValue({
    corporate: false,
    corporateReady: true,
    reviewRequired: false,
    openIssueCount: 0,
  });
});

describe("settleCommercePaymentByProviderToken", () => {
  it("rejects an empty token without touching iyzico", async () => {
    await expect(settleCommercePaymentByProviderToken("")).resolves.toEqual({ kind: "error", reason: "attempt" });
    expect(retrieveCheckout).not.toHaveBeenCalled();
  });

  it("returns not_found when the attempt row is missing", async () => {
    mockFrom({ commerce_payment_attempts: null });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({ kind: "not_found" });
  });

  it("does not re-run retrieve or send mail when the attempt is already PAID", async () => {
    mockFrom({
      commerce_payment_attempts: { ...ATTEMPT, status: "PAID" },
      commerce_orders: { user_id: null },
    });
    admin.rpc.mockResolvedValue({ data: null, error: null });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({
      kind: "paid",
      orderId: "order-1",
      reviewRequired: false,
    });
    expect(retrieveCheckout).not.toHaveBeenCalled();
    expect(sendActivationEmail).not.toHaveBeenCalled();
    expect(sendOrderReadyEmail).not.toHaveBeenCalled();
  });

  it("keeps a 3-D Secure attempt pending on recover instead of marking it failed", async () => {
    mockFrom({ commerce_payment_attempts: ATTEMPT });
    retrieveCheckout.mockResolvedValue({ status: "success", paymentStatus: "INIT_THREEDS" });
    await expect(settleCommercePaymentByProviderToken("token-1", { failIfUnpaid: false })).resolves.toEqual({
      kind: "pending",
      orderId: "order-1",
    });
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("maps ATTEMPT_NOT_FOUND after a verified payload", async () => {
    mockFrom({ commerce_payment_attempts: ATTEMPT });
    retrieveCheckout.mockResolvedValue(PAID_RESULT);
    admin.rpc.mockResolvedValue({ data: { outcome: "ATTEMPT_NOT_FOUND" }, error: null });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({ kind: "error", reason: "attempt" });
  });

  it("maps FAILED when iyzico is a terminal decline", async () => {
    mockFrom({ commerce_payment_attempts: ATTEMPT });
    retrieveCheckout.mockResolvedValue({ status: "failure", paymentStatus: "FAILURE", errorCode: "5001" });
    admin.rpc.mockResolvedValue({ data: { outcome: "FAILED", order_id: "order-1" }, error: null });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({ kind: "failed", orderId: "order-1" });
  });

  it("returns callback error when the RPC itself fails", async () => {
    mockFrom({ commerce_payment_attempts: ATTEMPT });
    retrieveCheckout.mockResolvedValue(PAID_RESULT);
    admin.rpc.mockResolvedValue({ data: null, error: { message: "rpc down" } });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({ kind: "error", reason: "callback" });
    error.mockRestore();
  });

  it("sends one guest activation on PAID_PROCESSED when the token row persisted", async () => {
    mockFrom({
      commerce_payment_attempts: ATTEMPT,
      commerce_orders: { user_id: null },
      activation_tokens: { id: "tok-1" },
    });
    retrieveCheckout.mockResolvedValue(PAID_RESULT);
    sendActivationEmail.mockResolvedValue({ sent: true });
    admin.rpc.mockResolvedValue({
      data: {
        outcome: "PAID_PROCESSED",
        order_id: "order-1",
        guest_email: "guest@example.com",
        order_number: "YI-1",
      },
      error: null,
    });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({
      kind: "paid",
      orderId: "order-1",
      reviewRequired: false,
    });
    expect(sendActivationEmail).toHaveBeenCalledTimes(1);
    expect(sendOrderReadyEmail).not.toHaveBeenCalled();
  });

  it("does not send a second guest activation on ALREADY_PAID", async () => {
    mockFrom({
      commerce_payment_attempts: ATTEMPT,
      commerce_orders: { user_id: null },
      activation_tokens: { id: "tok-1" },
    });
    retrieveCheckout.mockResolvedValue(PAID_RESULT);
    admin.rpc.mockResolvedValue({
      data: {
        outcome: "ALREADY_PAID",
        order_id: "order-1",
        guest_email: "guest@example.com",
        order_number: "YI-1",
      },
      error: null,
    });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({
      kind: "paid",
      orderId: "order-1",
      reviewRequired: false,
    });
    expect(sendActivationEmail).not.toHaveBeenCalled();
    expect(sendOrderReadyEmail).not.toHaveBeenCalled();
  });

  it("marks reviewRequired on PAID_REVIEW_REQUIRED without treating it as a second charge", async () => {
    mockFrom({
      commerce_payment_attempts: ATTEMPT,
      commerce_orders: { user_id: null },
      activation_tokens: { id: "tok-1" },
    });
    retrieveCheckout.mockResolvedValue(PAID_RESULT);
    sendActivationEmail.mockResolvedValue({ sent: true });
    admin.rpc.mockResolvedValue({
      data: {
        outcome: "PAID_REVIEW_REQUIRED",
        order_id: "order-1",
        guest_email: "guest@example.com",
        order_number: "YI-1",
      },
      error: null,
    });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({
      kind: "paid",
      orderId: "order-1",
      reviewRequired: true,
    });
    expect(sendActivationEmail).toHaveBeenCalledTimes(1);
  });

  it("auto-claims an authenticated PAID_PROCESSED order and sends the ready mail once", async () => {
    mockFrom({
      commerce_payment_attempts: ATTEMPT,
      commerce_orders: { user_id: "user-1" },
    });
    retrieveCheckout.mockResolvedValue(PAID_RESULT);
    sendOrderReadyEmail.mockResolvedValue({ sent: true });
    admin.rpc.mockImplementation(async (name: string) => {
      if (name === "process_commerce_payment_callback") {
        return {
          data: {
            outcome: "PAID_PROCESSED",
            order_id: "order-1",
            guest_email: "ada@example.com",
            order_number: "YI-1",
          },
          error: null,
        };
      }
      if (name === "finalize_authenticated_commerce_order") {
        return { data: { ok: true, review_required: false, open_issue_count: 0 }, error: null };
      }
      return { data: null, error: null };
    });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({
      kind: "paid",
      orderId: "order-1",
      reviewRequired: false,
    });
    expect(sendActivationEmail).not.toHaveBeenCalled();
    expect(sendOrderReadyEmail).toHaveBeenCalledTimes(1);
    expect(admin.rpc).toHaveBeenCalledWith("finalize_authenticated_commerce_order", { p_order_id: "order-1" });
  });

  it("records a fulfillment issue when iyzico is paid but the callback RPC fails", async () => {
    mockFrom({ commerce_payment_attempts: ATTEMPT });
    retrieveCheckout.mockResolvedValue(PAID_RESULT);
    admin.rpc.mockImplementation(async (name: string) => {
      if (name === "process_commerce_payment_callback") {
        return { data: null, error: { message: "connection reset" } };
      }
      return { data: null, error: null };
    });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({
      kind: "error",
      reason: "callback",
    });
    expect(admin.rpc).toHaveBeenCalledWith("record_commerce_fulfillment_issue", {
      p_order_id: "order-1",
      p_order_item_id: null,
      p_issue_code: "PAYMENT_CALLBACK_COMMIT_FAILED",
      p_details: { attemptId: "attempt-1", databaseError: "connection reset" },
    });
  });

  it("does not send a second ready mail when the callback is ALREADY_PAID", async () => {
    mockFrom({
      commerce_payment_attempts: ATTEMPT,
      commerce_orders: { user_id: "user-1" },
    });
    retrieveCheckout.mockResolvedValue(PAID_RESULT);
    admin.rpc.mockImplementation(async (name: string) => {
      if (name === "process_commerce_payment_callback") {
        return {
          data: {
            outcome: "ALREADY_PAID",
            order_id: "order-1",
            guest_email: "ada@example.com",
            order_number: "YI-1",
          },
          error: null,
        };
      }
      if (name === "finalize_authenticated_commerce_order") {
        return { data: { ok: true, review_required: false, open_issue_count: 0 }, error: null };
      }
      return { data: null, error: null };
    });
    await expect(settleCommercePaymentByProviderToken("token-1")).resolves.toEqual({
      kind: "paid",
      orderId: "order-1",
      reviewRequired: false,
    });
    expect(sendOrderReadyEmail).not.toHaveBeenCalled();
  });
});
