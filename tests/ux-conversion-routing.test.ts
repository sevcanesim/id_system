import { describe, expect, it } from "vitest";

import { getCardProfileCompletion } from "../lib/card-profile";
import {
  DEFAULT_BUSINESS_NEXT,
  DEFAULT_INDIVIDUAL_NEXT,
  resolveLoginReturnPath,
  safeLoginNext,
} from "../lib/auth/login-search";

const completeProfile = {
  name: "Sevcan Karadeniz",
  role: "Kurucu",
  company: "Yenomi",
  phone: "+905551112233",
  whatsapp: "+905551112233",
  email: "sevcan@example.com",
  website: "https://example.com",
  linkedin: "https://linkedin.com/in/example",
  instagram: "",
  location: "İzmir",
  image: "https://example.com/avatar.jpg",
};

describe("conversion routing", () => {
  it("defaults individual login to the active card workspace", () => {
    expect(DEFAULT_INDIVIDUAL_NEXT).toBe("/kartim");
    expect(safeLoginNext(undefined)).toBe("/kartim");
    expect(resolveLoginReturnPath("individual", "/kartlarim")).toBe("/kartim");
  });

  it("keeps the corporate workspace and explicit commerce targets", () => {
    expect(DEFAULT_BUSINESS_NEXT).toBe("/kurumsal/panel");
    expect(resolveLoginReturnPath("business", "/hesabim")).toBe("/kurumsal/panel");
    expect(resolveLoginReturnPath("individual", "/checkout")).toBe("/checkout");
    expect(resolveLoginReturnPath("business", "/checkout")).toBe("/checkout");
  });

  it("derives profile completion from canonical required fields", () => {
    const completion = getCardProfileCompletion({ ...completeProfile, image: "" });

    expect(completion.percent).toBe(80);
    expect(completion.isComplete).toBe(false);
    expect(completion.missing.map((item) => item.key)).toEqual(["image"]);
  });

  it("keeps recommended fields outside core completion", () => {
    const completion = getCardProfileCompletion({
      ...completeProfile,
      whatsapp: "",
      location: "",
    });

    expect(completion.percent).toBe(100);
    expect(completion.isComplete).toBe(true);
    expect(completion.recommended.map((item) => item.key)).toEqual(["whatsapp", "location"]);
  });
});
