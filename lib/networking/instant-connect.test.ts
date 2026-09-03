import { describe, expect, it } from "vitest";

import { instantConnectErrorMessage, isInstantConnectProfileEligible, isInstantConnectSource } from "./instant-connect";

const activeProfile = {
  id: "cde2bf7d-4e01-4a1a-9e44-6ad7d863bc45",
  user_id: "6a80bcf8-5244-4c5e-85ec-9cb7fe030bbd",
  name: "Selin Kaya",
  role: "Ürün Yöneticisi",
  company: "Yenomi Labs",
  email: "selin@example.com",
  image_url: null,
  is_published: true,
  card_status: "ACTIVE" as const,
  service_expires_at: null,
  grace_ends_at: null,
};

describe("instant connect eligibility", () => {
  it("only exposes active, published profiles with an email address", () => {
    expect(isInstantConnectProfileEligible(activeProfile)).toBe(true);
    expect(isInstantConnectProfileEligible({ ...activeProfile, email: "" })).toBe(false);
    expect(isInstantConnectProfileEligible({ ...activeProfile, card_status: "LOST" })).toBe(false);
    expect(isInstantConnectProfileEligible({ ...activeProfile, is_published: false })).toBe(false);
  });

  it("keeps the accepted public-card source vocabulary closed", () => {
    expect(isInstantConnectSource("QR")).toBe(true);
    expect(isInstantConnectSource("NFC")).toBe(true);
    expect(isInstantConnectSource("HANDSHAKE")).toBe(false);
  });

  it("returns user-safe error copy in both supported languages", () => {
    expect(instantConnectErrorMessage("SELF_CONNECTION", "tr")).toContain("Kendi");
    expect(instantConnectErrorMessage("SELF_CONNECTION", "en")).toContain("own");
  });
});
