import { describe, expect, it } from "vitest";
import { isValidCompanyTaxNumber, parseCompanyBilling } from "./company";

describe("corporate billing validation", () => {
  it("accepts a valid ten-digit VKN with company billing details", () => {
    expect(parseCompanyBilling({
      name: "Yenomilabs Teknoloji",
      taxNumber: "9876543217",
      taxOffice: "Hasan Tahsin",
    })).toMatchObject({ ok: true });
  });

  it("rejects an eleven-digit Turkish identity number for corporate checkout", () => {
    expect(isValidCompanyTaxNumber("10000000146")).toBe(false);
    expect(parseCompanyBilling({
      name: "Bireysel Alıcı",
      taxNumber: "10000000146",
      taxOffice: "Hasan Tahsin",
    })).toMatchObject({ ok: false });
  });
});
