import { describe, expect, it } from "vitest";
import { createPaytrPresentationSecret, createPaytrResultReference, hashPaytrPresentationSecret, openPaytrPresentationToken, resolvePaytrResultReference, sealPaytrPresentationToken } from "./paytr-presentation";

const key = Buffer.alloc(32, 7).toString("base64url");

describe("PayTR presentation token", () => {
  it("encrypts the provider token and refuses a modified ciphertext", () => {
    const sealed = sealPaytrPresentationToken("provider-token", key);
    expect(sealed).not.toContain("provider-token");
    expect(openPaytrPresentationToken(sealed, key)).toBe("provider-token");
    expect(openPaytrPresentationToken(`${sealed}x`, key)).toBeNull();
  });

  it("creates a non-recoverable presentation secret hash", () => {
    const secret = createPaytrPresentationSecret();
    expect(secret.value).toHaveLength(43);
    expect(secret.hash).toBe(hashPaytrPresentationSecret(secret.value));
  });

  it("keeps the order id out of a short-lived payment result reference", () => {
    const orderId = "550e8400-e29b-41d4-a716-446655440000";
    const reference = createPaytrResultReference(orderId, 1_000, key);
    expect(reference).not.toContain(orderId);
    expect(resolvePaytrResultReference(reference, 2_000, key)).toMatchObject({ orderId });
    expect(resolvePaytrResultReference(reference, 2_701_000, key)).toBeNull();
  });
});
