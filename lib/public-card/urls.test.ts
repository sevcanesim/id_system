import { describe, expect, it } from "vitest";
import { cardQrPath, cardSharePath, eventAttributionPath, looksLikePublicId } from "./urls";

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
});
