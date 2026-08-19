import { describe, expect, it } from "vitest";
import { RESERVED_CARD_SLUGS, validateCardSlug } from "./slug";

describe("card slug contract", () => {
  it("reserves system and language-adjacent words", () => {
    for (const value of ["login", "api", "support", "company", "settings", "superadmin", "help", "e", "admin", "giris", "p"]) {
      expect(RESERVED_CARD_SLUGS.has(value)).toBe(true);
      expect(validateCardSlug(value)).toContain("sistem");
    }
  });

  it("accepts readable person slugs without company or language prefixes", () => {
    expect(validateCardSlug("ahmet-yilmaz")).toBe("");
    expect(validateCardSlug("ahmet-yilmaz-2")).toBe("");
  });
});
