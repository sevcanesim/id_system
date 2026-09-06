import { describe, expect, it } from "vitest";
import { createSafeWebhookPayload, validateWebhookEndpoint } from "./webhook-integrations";

describe("webhook endpoint validation", () => {
  it("accepts only HTTPS public endpoint syntax", () => {
    expect(validateWebhookEndpoint("https://hooks.example.com/events")?.toString()).toBe("https://hooks.example.com/events");
    expect(validateWebhookEndpoint("http://hooks.example.com/events")).toBeNull();
    expect(validateWebhookEndpoint("https://hooks.example.com:8443/events")).toBeNull();
  });

  it("rejects local, private, carrier-grade and reserved address literals", () => {
    for (const endpoint of [
      "https://127.0.0.1/hook",
      "https://10.0.0.1/hook",
      "https://100.64.0.1/hook",
      "https://169.254.169.254/latest/meta-data",
      "https://172.16.0.1/hook",
      "https://192.168.1.1/hook",
      "https://198.18.0.1/hook",
      "https://localhost/hook",
      "https://crm.internal/hook",
      "https://[::1]/hook",
      "https://[fd00::1]/hook",
      "https://[::ffff:7f00:1]/hook",
    ]) {
      expect(validateWebhookEndpoint(endpoint)).toBeNull();
    }
  });

  it("allows only operational metadata in lead delivery payloads", () => {
    const payload = createSafeWebhookPayload("LEAD_CREATED", {
      leadId: "lead-1",
      source: "QR",
      score: 20,
      status: "NEW",
      fullName: "Ada Soylu",
      email: "ada@example.test",
      phone: "+905550000000",
    });

    expect(payload.data).toEqual({ leadId: "lead-1", source: "QR", score: 20, status: "NEW" });
  });
});
