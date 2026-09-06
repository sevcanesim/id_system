import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/payments/config", () => ({
  isPaytrConfigured: true,
}));

vi.mock("../../../../../lib/payments/paytr", () => ({
  paytrFailureCode: vi.fn(),
  verifyPaytrCallbackHash: vi.fn(),
}));

vi.mock("../../../../../lib/payments/settle-commerce-payment", () => ({
  settleCommercePaymentByPaytrCallback: vi.fn(),
}));

vi.mock("../../../../../lib/payments/payment-callback-receipts", () => ({
  recordPaytrCallbackReceived: vi.fn().mockResolvedValue("receipt-hash"),
  finalizePaytrCallbackReceipt: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../../../lib/observability/system-errors", () => ({
  recordSystemError: vi.fn().mockResolvedValue(true),
}));

import {
  paytrFailureCode,
  verifyPaytrCallbackHash,
} from "../../../../../lib/payments/paytr";
import { settleCommercePaymentByPaytrCallback } from "../../../../../lib/payments/settle-commerce-payment";
import { finalizePaytrCallbackReceipt } from "../../../../../lib/payments/payment-callback-receipts";
import { POST } from "./route";

const merchantOid = `PT${"a".repeat(32)}`;

function callbackRequest(input: { status?: "success" | "failed"; failureCode?: string } = {}) {
  const form = new FormData();
  form.set("merchant_oid", merchantOid);
  form.set("status", input.status ?? "success");
  form.set("total_amount", "14900");
  form.set("hash", "signed-callback");
  if (input.failureCode) {
    form.set("failed_reason_code", input.failureCode);
  }
  return new NextRequest("https://yenomi.test/api/payments/paytr/callback", {
    method: "POST",
    body: form,
  });
}

describe("PayTR callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(paytrFailureCode).mockReturnValue("PAYTR_PAYMENT_FAILED");
    vi.mocked(verifyPaytrCallbackHash).mockReturnValue(true);
    vi.mocked(settleCommercePaymentByPaytrCallback).mockResolvedValue({
      kind: "paid",
      orderId: "order-1",
      reviewRequired: false,
    });
  });

  it("acknowledges a duplicate, verified callback with literal OK", async () => {
    const first = await POST(callbackRequest());
    const second = await POST(callbackRequest());

    expect(first.status).toBe(200);
    await expect(first.text()).resolves.toBe("OK");
    expect(second.status).toBe(200);
    await expect(second.text()).resolves.toBe("OK");
    expect(settleCommercePaymentByPaytrCallback).toHaveBeenCalledTimes(2);
    expect(settleCommercePaymentByPaytrCallback).toHaveBeenLastCalledWith(expect.objectContaining({
      merchantOid,
      paid: true,
      totalAmountKurus: 14900,
    }));
  });

  it("rejects an unsigned callback before it can reach payment settlement", async () => {
    vi.mocked(verifyPaytrCallbackHash).mockReturnValue(false);

    const response = await POST(callbackRequest());

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toBe("INVALID_CALLBACK");
    expect(settleCommercePaymentByPaytrCallback).not.toHaveBeenCalled();
  });

  it("persists only an allowlisted decline code for a signed failed callback", async () => {
    vi.mocked(paytrFailureCode).mockReturnValue("PAYTR_DECLINED_51");
    vi.mocked(settleCommercePaymentByPaytrCallback).mockResolvedValue({
      kind: "failed",
      orderId: "order-1",
    });

    const response = await POST(
      callbackRequest({ status: "failed", failureCode: "51" }),
    );

    expect(response.status).toBe(200);
    expect(paytrFailureCode).toHaveBeenCalledWith("51");
    expect(settleCommercePaymentByPaytrCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        paid: false,
        errorCode: "PAYTR_DECLINED_51",
      }),
    );
    expect(finalizePaytrCallbackReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "PROCESSED",
        errorCode: "PAYTR_DECLINED_51",
      }),
    );
  });

  it("does not acknowledge a callback whose payment state could not be committed", async () => {
    vi.mocked(settleCommercePaymentByPaytrCallback).mockResolvedValue({ kind: "error", reason: "callback" });

    const response = await POST(callbackRequest());

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("CALLBACK_RETRY");
    expect(finalizePaytrCallbackReceipt).toHaveBeenCalledWith(expect.objectContaining({
      providerReferenceHash: "receipt-hash",
      status: "RETRYING",
    }));
  });
});
