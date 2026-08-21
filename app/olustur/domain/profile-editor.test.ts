import { describe, expect, it } from "vitest";
import { INITIAL_CARD_DATA, sanitizeCardDraft } from "./profile-editor";

describe("sanitizeCardDraft", () => {
  it("keeps structural fields and drops contact and image material", () => {
    const stored = sanitizeCardDraft({
      ...INITIAL_CARD_DATA,
      name: "Ada Yenomi",
      role: "Kurucu",
      company: "Yenomi",
      phone: "+905551112233",
      email: "ada@example.com",
      image: "data:image/png;base64,abc",
      website: "https://yenomi.com",
    });
    expect(stored.name).toBe("Ada Yenomi");
    expect(stored.role).toBe("Kurucu");
    expect(stored.website).toBe("https://yenomi.com");
    expect(stored.phone).toBe("");
    expect(stored.email).toBe("");
    expect(stored.image).toBe("");
  });
});
