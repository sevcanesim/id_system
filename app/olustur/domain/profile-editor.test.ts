import { describe, expect, it } from "vitest";
import { calculateProfileCompletion, formatMissingItemsText, INITIAL_CARD_DATA, sanitizeCardDraft } from "./profile-editor";

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

describe("calculateProfileCompletion & formatMissingItemsText", () => {
  it("calculates 0% for empty profile", () => {
    expect(calculateProfileCompletion(INITIAL_CARD_DATA)).toBe(0);
  });

  it("calculates 17% for identity category (name + role)", () => {
    const data = {
      ...INITIAL_CARD_DATA,
      name: "Selin Kaya",
      role: "Ürün Yöneticisi",
    };
    expect(calculateProfileCompletion(data)).toBe(17);
    expect(formatMissingItemsText(data)).toBe("iletişim bilgisi ve profil fotoğrafı ekleyerek kartını tamamla.");
  });

  it("calculates 33% for identity and contact categories", () => {
    const data = {
      ...INITIAL_CARD_DATA,
      name: "Selin Kaya",
      role: "Ürün Yöneticisi",
      email: "selin@yenomi.com",
    };
    expect(calculateProfileCompletion(data)).toBe(33);
  });

  it("calculates 83% for 5 completed categories", () => {
    const data = {
      ...INITIAL_CARD_DATA,
      name: "Selin Kaya",
      role: "Ürün Yöneticisi",
      email: "selin@yenomi.com",
      image: "https://example.com/avatar.jpg",
      company: "Yenomi Labs",
      bio: "Yenomi ID ürün lideri",
    };
    expect(calculateProfileCompletion(data)).toBe(83);
    expect(formatMissingItemsText(data)).toBe("LinkedIn ekleyerek kartını tamamla.");
  });

  it("returns 100% when all 6 categories are filled", () => {
    const fullData = {
      ...INITIAL_CARD_DATA,
      name: "Selin Kaya",
      role: "Ürün Yöneticisi",
      company: "Yenomi Labs",
      phone: "+905551112233",
      email: "selin@yenomi.com",
      image: "https://example.com/avatar.jpg",
      linkedin: "https://linkedin.com/in/selinkaya",
      bio: "Yenomi ID ürün lideri",
    };
    expect(calculateProfileCompletion(fullData)).toBe(100);
    expect(formatMissingItemsText(fullData)).toBe("Profiliniz tam kapasiteyle yayınlanmaya hazır.");
  });
});

