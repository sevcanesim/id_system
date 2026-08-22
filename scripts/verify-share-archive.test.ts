import { describe, expect, it } from "vitest";
import { isForbiddenShareEntry } from "../scripts/verify-share-archive.mjs";

describe("isForbiddenShareEntry", () => {
  it("blocks env files and Vercel metadata but keeps .env.example", () => {
    expect(isForbiddenShareEntry(".env")).toBe(true);
    expect(isForbiddenShareEntry("src/.env.local")).toBe(true);
    expect(isForbiddenShareEntry("yenomi-id-v25.9.4-source/.env.production")).toBe(true);
    expect(isForbiddenShareEntry(".env.example")).toBe(false);
    expect(isForbiddenShareEntry("docs/.env.example")).toBe(false);
    expect(isForbiddenShareEntry(".vercel/README.txt")).toBe(true);
    expect(isForbiddenShareEntry("README.md")).toBe(false);
  });
});
