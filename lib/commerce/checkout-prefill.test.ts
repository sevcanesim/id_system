import { describe, expect, it } from "vitest";
import { mergeCheckoutPrefill, sessionCheckoutPrefill } from "./checkout-prefill";

describe("sessionCheckoutPrefill", () => {
  it("reads name and phone from the session without inventing identity numbers", () => {
    expect(sessionCheckoutPrefill({
      email: "ada@yenomi.test",
      phone: "+905551112233",
      user_metadata: { full_name: "Ada Yenomi" },
    })).toEqual({
      email: "ada@yenomi.test",
      recipientName: "Ada Yenomi",
      phone: "+90 555 111 22 33",
    });
  });

  it("does not overwrite fields the buyer already typed", () => {
    const merged = mergeCheckoutPrefill({
      email: "typed@yenomi.test",
      recipientName: "Mevcut Ad",
      phone: "",
      addressLine: "",
      district: "",
      city: "",
      postalCode: "",
    }, { email: "ada@yenomi.test", recipientName: "Ada Yenomi", phone: "+90 555 111 22 33" });
    expect(merged.email).toBe("typed@yenomi.test");
    expect(merged.recipientName).toBe("Mevcut Ad");
    expect(merged.phone).toBe("+90 555 111 22 33");
  });
});
