import { describe, expect, it } from "vitest";
import { cardQrPath, cardSharePath, cardShareUrl, eventAttributionPath, looksLikePublicId, publicCardHost, publicCardOrigin } from "./urls";

describe("public card URL contract", () => {
  it("keeps share links on the readable slug under /p", () => {
    expect(cardSharePath("ahmet-yilmaz")).toBe("/p/ahmet-yilmaz");
  });

  it("keeps QR identity on the immutable public id under /p", () => {
    expect(cardQrPath("8Kx4mQ72")).toBe("/p/8Kx4mQ72");
  });

  it("does not put company slugs or language prefixes in the person path", () => {
    expect(cardSharePath("ahmet-yilmaz")).not.toContain("/company/");
    expect(cardSharePath("ahmet-yilmaz")).not.toContain("/tr/");
    expect(cardSharePath("ahmet-yilmaz")).not.toContain("/en/");
  });

  it("keeps event attribution on a separate /e layer", () => {
    expect(eventAttributionPath("7F3k92")).toBe("/e/7F3k92");
  });

  it("does not encode GPS or language prefixes into QR or share paths", () => {
    expect(cardQrPath("8Kx4mQ72")).toBe("/p/8Kx4mQ72");
    expect(cardSharePath("ahmet-yilmaz-istanbul")).toBe("/p/ahmet-yilmaz-istanbul");
  });

  it("treats hyphenated slugs as not public ids", () => {
    expect(looksLikePublicId("ahmet-yilmaz")).toBe(false);
    expect(looksLikePublicId("8Kx4mQ72")).toBe(true);
  });

  it("prefers NEXT_PUBLIC_SITE_URL over the production fallback host", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://yenomi-id.vercel.app/";
    try {
      expect(publicCardOrigin()).toBe("https://yenomi-id.vercel.app");
      expect(publicCardHost()).toBe("yenomi-id.vercel.app");
      expect(cardShareUrl("selin-kaya")).toBe("https://yenomi-id.vercel.app/p/selin-kaya");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });

  it("keeps the production fallback host when no site URL is configured", () => {
    const previous = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    try {
      expect(publicCardOrigin()).toBe("https://qr.yenomilabs.com");
      expect(publicCardHost()).toBe("qr.yenomilabs.com");
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
      else process.env.NEXT_PUBLIC_SITE_URL = previous;
    }
  });
});
