import { describe, expect, it, vi } from "vitest";

import {
  createOrganizationAssetSignedUrl,
  isOrganizationAssetPubliclyAvailable,
} from "./organization-assets";

const assetPath = "11111111-1111-1111-1111-111111111111/catalog-1700000000000.pdf";

describe("organization asset URLs", () => {
  it("does not expose unpublished, invalid-date, or future-dated assets", () => {
    const now = Date.parse("2026-09-03T12:00:00.000Z");

    expect(isOrganizationAssetPubliclyAvailable(false, null, now)).toBe(false);
    expect(isOrganizationAssetPubliclyAvailable(true, "not-a-date", now)).toBe(false);
    expect(isOrganizationAssetPubliclyAvailable(true, "2026-09-03T12:00:01.000Z", now)).toBe(false);
    expect(isOrganizationAssetPubliclyAvailable(true, "2026-09-03T11:59:59.000Z", now)).toBe(true);
  });

  it("only signs paths in the organization asset namespace", async () => {
    const createSignedUrl = vi.fn();
    const from = vi.fn(() => ({ createSignedUrl, remove: vi.fn() }));
    const admin = { storage: { from } };

    await expect(createOrganizationAssetSignedUrl(admin, "other-bucket/secret.pdf")).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns a short-lived signed URL for a valid corporate PDF", async () => {
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://storage.example/signed" },
      error: null,
    });
    const from = vi.fn(() => ({ createSignedUrl, remove: vi.fn() }));
    const admin = { storage: { from } };

    await expect(createOrganizationAssetSignedUrl(admin, assetPath, 600))
      .resolves.toBe("https://storage.example/signed");
    expect(createSignedUrl).toHaveBeenCalledWith(assetPath, 600);
  });
});
