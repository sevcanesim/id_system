import { describe, expect, it } from "vitest";
import { ORGANIZATION_ROLES, canManageOrganizationLegalProfile } from "../lib/organizations/permissions";

describe("organization legal profile permissions", () => {
  it("allows only an active owner to change tax and billing identity", () => {
    expect(canManageOrganizationLegalProfile("OWNER", "ACTIVE")).toBe(true);
    expect(canManageOrganizationLegalProfile("ADMIN", "ACTIVE")).toBe(false);
    expect(canManageOrganizationLegalProfile("HR", "ACTIVE")).toBe(false);
    expect(canManageOrganizationLegalProfile("EMPLOYEE", "ACTIVE")).toBe(false);
  });

  it("never permits inactive memberships", () => {
    expect(canManageOrganizationLegalProfile("OWNER", "SUSPENDED")).toBe(false);
  });

  it("exposes only the supported organization roles", () => {
    expect(ORGANIZATION_ROLES).toEqual(["OWNER", "ADMIN", "HR", "EMPLOYEE"]);
  });
});
