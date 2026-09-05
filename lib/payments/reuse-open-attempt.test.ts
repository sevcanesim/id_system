import { describe, expect, it } from "vitest";

import { decideOpenPaymentAttempt } from "./reuse-open-attempt";

describe("decideOpenPaymentAttempt", () => {
  it("does not reuse a missing or completed attempt", () => {
    expect(decideOpenPaymentAttempt(null, "fingerprint")).toBe("none");
    expect(decideOpenPaymentAttempt({
      status: "PAID",
      request_fingerprint: "fingerprint",
      payment_page_url: "https://pay.example/checkout",
    }, "fingerprint")).toBe("none");
  });

  it("reuses only the same fingerprint with an available payment page", () => {
    expect(decideOpenPaymentAttempt({
      status: "PENDING",
      request_fingerprint: "fingerprint",
      payment_page_url: "https://pay.example/checkout",
    }, "fingerprint")).toBe("reuse");
  });

  it("keeps competing or in-flight requests from opening a second session", () => {
    expect(decideOpenPaymentAttempt({
      status: "PENDING",
      request_fingerprint: "different",
      payment_page_url: "https://pay.example/checkout",
    }, "fingerprint")).toBe("conflict");
    expect(decideOpenPaymentAttempt({
      status: "PENDING",
      request_fingerprint: "fingerprint",
      payment_page_url: null,
      updated_at: new Date(1_000).toISOString(),
    }, "fingerprint", 2_000)).toBe("conflict");
  });

  it("releases only a stale initialization without a hosted payment page", () => {
    expect(decideOpenPaymentAttempt({
      status: "PENDING",
      request_fingerprint: "fingerprint",
      payment_page_url: null,
      updated_at: new Date(1_000).toISOString(),
    }, "fingerprint", 122_000)).toBe("abandon");
  });
});
