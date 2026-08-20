import { describe, expect, it } from "vitest";
import { decideOpenPaymentAttempt } from "./reuse-open-attempt";

describe("decideOpenPaymentAttempt", () => {
  it("reuses a live PENDING session with the same fingerprint", () => {
    expect(
      decideOpenPaymentAttempt(
        { status: "PENDING", request_fingerprint: "fp-1", payment_page_url: "https://pay.example/1" },
        "fp-1",
      ),
    ).toBe("reuse");
  });

  it("conflicts when the cart fingerprint changed under an open session", () => {
    expect(
      decideOpenPaymentAttempt(
        { status: "PENDING", request_fingerprint: "fp-old", payment_page_url: "https://pay.example/1" },
        "fp-new",
      ),
    ).toBe("conflict");
  });

  it("abandons a stuck PENDING row that never received an iyzico URL", () => {
    expect(
      decideOpenPaymentAttempt(
        { status: "PENDING", request_fingerprint: "fp-1", payment_page_url: null },
        "fp-1",
      ),
    ).toBe("abandon");
  });

  it("ignores terminal attempts so a failed init can start a new session", () => {
    expect(
      decideOpenPaymentAttempt(
        { status: "FAILED", request_fingerprint: "fp-1", payment_page_url: null },
        "fp-1",
      ),
    ).toBe("none");
  });
});
