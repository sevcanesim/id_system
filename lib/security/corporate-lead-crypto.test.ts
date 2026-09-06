import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { canEncryptCorporateLeads, decryptCorporateLeadPayload, encryptCorporateLeadPayload } from "./corporate-lead-crypto";

const previousKey = process.env.CORPORATE_LEAD_ENCRYPTION_KEY;

afterEach(() => {
  if (previousKey === undefined) delete process.env.CORPORATE_LEAD_ENCRYPTION_KEY;
  else process.env.CORPORATE_LEAD_ENCRYPTION_KEY = previousKey;
});

describe("corporate lead encryption", () => {
  it("binds encrypted content to one lead identifier", () => {
    process.env.CORPORATE_LEAD_ENCRYPTION_KEY = "test-key-for-corporate-leads";
    const leadId = randomUUID();
    const encrypted = encryptCorporateLeadPayload(leadId, {
      fullName: "Sevcan Eşim Karadeniz",
      email: "sevcan@example.test",
      company: "Yenomilabs",
      employeeCount: "5",
      message: "Teklif talebi",
    });

    expect(canEncryptCorporateLeads()).toBe(true);
    expect(encrypted).toBeTruthy();
    expect(decryptCorporateLeadPayload(leadId, encrypted)).toMatchObject({ company: "Yenomilabs" });
    expect(decryptCorporateLeadPayload(randomUUID(), encrypted)).toBeNull();
  });
});
