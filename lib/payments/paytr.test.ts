import { createHmac } from "crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("./config", () => ({
  paytrConfig: {
    merchantId: "merchant-id",
    merchantKey: "merchant-key",
    merchantSalt: "merchant-salt",
    testMode: true,
  },
}));

import { createPaytrTokenHash, createPaytrUserBasket, paytrIframeUrl, verifyPaytrCallbackHash } from "./paytr";

describe("PayTR payment primitives", () => {
  it("creates the documented token HMAC without leaking credentials into the basket", () => {
    const userBasket = createPaytrUserBasket([{ name: "Yenomi ID Premium", unitPriceKurus: 249000, quantity: 1 }]);
    const actual = createPaytrTokenHash({
      merchantId: "merchant-id",
      merchantKey: "merchant-key",
      merchantSalt: "merchant-salt",
      userIp: "127.0.0.1",
      merchantOid: "PTabc123",
      email: "buyer@example.test",
      paymentAmount: "249000",
      userBasket,
      testMode: "1",
    });
    const expectedSource = `merchant-id127.0.0.1PTabc123buyer@example.test249000${userBasket}00TL1merchant-salt`;
    expect(actual).toBe(createHmac("sha256", "merchant-key").update(expectedSource).digest("base64"));
    expect(Buffer.from(userBasket, "base64").toString("utf8")).toBe('[["Yenomi ID Premium","2490.00",1]]');
  });

  it("accepts only an exact signed callback and preserves an opaque iframe token", () => {
    const merchantOid = "PTabc123";
    const status = "success";
    const totalAmount = "249000";
    const hash = createHmac("sha256", "merchant-key")
      .update(`${merchantOid}merchant-salt${status}${totalAmount}`)
      .digest("base64");
    expect(verifyPaytrCallbackHash({ merchantOid, status, totalAmount, hash })).toBe(true);
    expect(verifyPaytrCallbackHash({ merchantOid, status, totalAmount: "249001", hash })).toBe(false);
    expect(paytrIframeUrl("a/b?c")).toBe("https://www.paytr.com/odeme/guvenli/a%2Fb%3Fc");
  });
});
