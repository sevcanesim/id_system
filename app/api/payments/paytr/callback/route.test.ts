import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../lib/payments/config", () => ({
  isPaytrConfigured: true,
}));

vi.mock("../../../../../lib/payments/paytr", () => ({
  verifyPaytrCallbackHash: vi.fn(),
}));

vi.mock("../../../../../lib/payments/settle-commerce-payment", () => ({
  settleCommercePaymentByPaytrCallback: vi.fn(),
}));

import { verifyPaytrCallbackHash } from "../../../../../lib/payments/paytr";
import { settleCommercePaymentByPaytrCallback } from "../../../../../lib/payments/settle-commerce-payment";
import { POST } from "./route";

const merchantOid = `PT${"a".repeat(32)}`;

function callbackRequest() {
  const form = new FormData();
  form.set("merchant_oid", merchantOid);
  form.set("status", "success");
  form.set("total_amount", "14900");
  form.set("hash", "signed-callback");
  return new NextRequest("https://yenomi.test/api/payments/paytr/callback", {
    method: "POST",
    body: form,
  });
}

describe("PayTR callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
