import { describe, expect, it } from "vitest";
import { isPublicHttpsWebhook } from "./resend";

describe("isPublicHttpsWebhook", () => {
  it("accepts public https endpoints", () => {
    expect(isPublicHttpsWebhook("https://hooks.slack.com/services/T/B/x")).toBe(true);
    expect(isPublicHttpsWebhook("https://example.com/ops")).toBe(true);
  });

  it("rejects loopback, private, and non-https targets", () => {
    expect(isPublicHttpsWebhook("http://hooks.slack.com/services/T/B/x")).toBe(false);
    expect(isPublicHttpsWebhook("https://localhost/hook")).toBe(false);
    expect(isPublicHttpsWebhook("https://127.0.0.1/hook")).toBe(false);
    expect(isPublicHttpsWebhook("https://10.0.0.8/hook")).toBe(false);
    expect(isPublicHttpsWebhook("https://192.168.1.9/hook")).toBe(false);
    expect(isPublicHttpsWebhook("https://169.254.1.1/hook")).toBe(false);
    expect(isPublicHttpsWebhook("https://ops.internal/hook")).toBe(false);
    expect(isPublicHttpsWebhook("https://user:pass@hooks.slack.com/x")).toBe(false);
    expect(isPublicHttpsWebhook("not-a-url")).toBe(false);
  });
});
