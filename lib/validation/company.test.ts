import { describe, expect, it } from "vitest";
import { isValidCompanyTaxNumber, isValidTurkishTaxNumber, parseCompanyBilling } from "./company";

describe("company billing", () => {
  it("accepts a checksum-valid 10-digit VKN", () => {
    expect(isValidTurkishTaxNumber("6440962576")).toBe(true);
    expect(isValidCompanyTaxNumber("6440962576")).toBe(true);
  });

  it("rejects malformed tax numbers", () => {
    expect(isValidTurkishTaxNumber("0000000000")).toBe(false);
    expect(isValidTurkishTaxNumber("1111111111")).toBe(false);
    expect(isValidCompanyTaxNumber("123")).toBe(false);
    expect(parseCompanyBilling({ name: "A", taxNumber: "6440962576", taxOffice: "Kadıköy" }).ok).toBe(false);
    expect(parseCompanyBilling({ name: "Yenomi Labs", taxNumber: "6440962576", taxOffice: "" }).ok).toBe(false);
  });

  it("normalizes unvan, vergi no and vergi dairesi", () => {
    expect(parseCompanyBilling({
      name: "  Yenomi Labs A.Ş.  ",
      taxNumber: "6440 962 576",
      taxOffice: " Kadıköy ",
    })).toEqual({
      ok: true,
      company: { name: "Yenomi Labs A.Ş.", taxNumber: "6440962576", taxOffice: "Kadıköy" },
    });
  });
});
