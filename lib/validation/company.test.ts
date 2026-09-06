import { describe, expect, it } from "vitest";
import { isValidCompanyTaxNumber, parseCompanyBilling } from "./company";

describe("corporate billing validation", () => {
  it("accepts a valid ten-digit VKN with company billing details", () => {
    expect(parseCompanyBilling({
      entityType: "LIMITED_COMPANY",
      name: "Yenomilabs Teknoloji",
      taxNumber: "9876543217",
      taxOffice: "Hasan Tahsin",
    })).toMatchObject({ ok: true });
  });

  it("accepts a Turkish identity number only for a sole proprietorship", () => {
    expect(isValidCompanyTaxNumber("10000000146", "SOLE_PROPRIETORSHIP")).toBe(true);
    expect(parseCompanyBilling({
      entityType: "SOLE_PROPRIETORSHIP",
      name: "Sevcan Eşim Karadeniz Şahıs İşletmesi",
      taxNumber: "10000000146",
      taxOffice: "Hasan Tahsin",
    })).toMatchObject({ ok: true });
  });

  it("rejects a Turkish identity number for a limited company", () => {
    expect(isValidCompanyTaxNumber("10000000146", "LIMITED_COMPANY")).toBe(false);
    expect(parseCompanyBilling({
      entityType: "LIMITED_COMPANY",
      name: "Yenomilabs Teknoloji Limited Şirketi",
      taxNumber: "10000000146",
      taxOffice: "Hasan Tahsin",
    })).toMatchObject({ ok: false });
  });
});
