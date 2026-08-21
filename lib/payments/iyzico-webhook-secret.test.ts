import { describe, expect, it } from "vitest";
import { webhookSecretHeaderMatches } from "./iyzico-webhook-secret";

describe("webhookSecretHeaderMatches", () => {
  it("allows the request when no secret is configured", () => {
    expect(webhookSecretHeaderMatches(null, undefined)).toBe(true);
    expect(webhookSecretHeaderMatches(null, "")).toBe(true);
    expect(webhookSecretHeaderMatches("anything", "   ")).toBe(true);
  });

  it("rejects a missing or wrong header when a secret is set", () => {
    expect(webhookSecretHeaderMatches(null, "super-secret")).toBe(false);
    expect(webhookSecretHeaderMatches("nope", "super-secret")).toBe(false);
    expect(webhookSecretHeaderMatches("super-secret", "super-secret")).toBe(true);
  });
});
