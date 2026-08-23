import { describe, expect, it, vi } from "vitest";
import { isOrganizationAssetPath, removeOrganizationAsset } from "./organization-assets";

const valid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/catalog-1710000000000.pdf";

describe("organization asset paths", () => {
  it("accepts tenant-scoped PDF objects", () => {
    expect(isOrganizationAssetPath(valid)).toBe(true);
    expect(isOrganizationAssetPath("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/presentation-1.pdf")).toBe(true);
  });

  it("rejects traversal and foreign buckets", () => {
    expect(isOrganizationAssetPath("../secret.pdf")).toBe(false);
    expect(isOrganizationAssetPath("organization-assets/catalog-1.pdf")).toBe(false);
    expect(isOrganizationAssetPath("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/catalog-1.txt")).toBe(false);
    expect(isOrganizationAssetPath("")).toBe(false);
  });

  it("removes only allowlisted paths", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const admin = { storage: { from: () => ({ remove }) } };
    await expect(removeOrganizationAsset(admin, valid)).resolves.toEqual({ removed: true });
    await expect(removeOrganizationAsset(admin, "../x.pdf")).resolves.toEqual({ removed: false });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith([valid]);
  });
});
