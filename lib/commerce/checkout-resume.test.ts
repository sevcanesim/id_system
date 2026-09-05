import { afterEach, describe, expect, it } from "vitest";

import {
  checkoutResumeCodeExpiry,
  createCheckoutContinuation,
  createCheckoutResumeCode,
  hashCheckoutResumeCode,
  verifyCheckoutContinuation,
} from "./checkout-resume";

const originalSecret = process.env.CHECKOUT_RESUME_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.CHECKOUT_RESUME_SECRET;
  else process.env.CHECKOUT_RESUME_SECRET = originalSecret;
});

describe("secure checkout continuation", () => {
  it("uses an opaque code and stores only its stable hash", () => {
    const code = createCheckoutResumeCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]{40,80}$/);
    expect(hashCheckoutResumeCode(code)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashCheckoutResumeCode(code)).not.toBe(code);
  });

  it("limits checkout links to fifteen minutes", () => {
    const now = Date.UTC(2026, 8, 6, 12, 0, 0);
    expect(checkoutResumeCodeExpiry(now).getTime() - now).toBe(15 * 60 * 1000);
  });

  it("accepts only an untampered, unexpired HttpOnly continuation", () => {
    process.env.CHECKOUT_RESUME_SECRET = "test-checkout-resume-secret";
    const now = Date.UTC(2026, 8, 6, 12, 0, 0);
    const orderId = "550e8400-e29b-41d4-a716-446655440000";
    const continuation = createCheckoutContinuation(orderId, now);
    expect(continuation).toBeTruthy();
    expect(verifyCheckoutContinuation(continuation as string, now)).toMatchObject({ orderId });
    expect(verifyCheckoutContinuation(`${continuation}x`, now)).toBeNull();
    expect(verifyCheckoutContinuation(continuation as string, now + 10 * 60 * 1000)).toBeNull();
  });
});
