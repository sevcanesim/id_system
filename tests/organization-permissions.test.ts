import { describe, expect, it } from "vitest";
import { canManageOrganizationLegalProfile } from "../lib/organizations/permissions";

describe("organization legal profile permissions", () => {
  it("allows only an active owner to change tax and billing identity", () => {
    expect(canManageOrganizationLegalProfile("OWNER", "ACTIVE")).toBe(true);
    expect(canManageOrganizationLegalProfile("ADMIN", "ACTIVE")).toBe(false);
    expect(canManageOrganizationLegalProfile("HR", "ACTIVE")).toBe(false);
    expect(canManageOrganizationLegalProfile("DEPARTMENT_MANAGER", "ACTIVE")).toBe(false);
    expect(canManageOrganizationLegalProfile("EMPLOYEE", "ACTIVE")).toBe(false);
  });

  it("never permits inactive memberships", () => {
    expect(canManageOrganizationLegalProfile("OWNER", "SUSPENDED")).toBe(false);
  });
});
