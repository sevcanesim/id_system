import { describe, expect, it } from "vitest";
import { COMMERCIAL_SKUS } from "../config/commercial";
import {
  ADMIN_PROVISION_PLAN_CODES,
  CORPORATE_PACKAGE_LADDER,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_PLAN,
} from "../commerce/packages";
import {
  IDENTITY_PACKAGE_CATALOG,
  IDENTITY_PRODUCT_FAMILIES,
  UNASSIGNED_PACKAGE_CODE,
  assertAdminProvisionPlansAreCatalogued,
  familyFromCommerceKind,
  occupancyFromAccountType,
  packageCodeFromSku,
  typesFromPackageCode,
  typesFromSku,
} from "./user-types";

describe("user identity types", () => {
  it("keeps Digital ID occupancy split from Pet ID family", () => {
    expect(IDENTITY_PRODUCT_FAMILIES).toContain("DIGITAL_ID");
    expect(IDENTITY_PRODUCT_FAMILIES).toContain("PET_ID");
    expect(typesFromPackageCode("INDIVIDUAL")).toEqual({
      productFamily: "DIGITAL_ID",
      occupancy: "INDIVIDUAL",
      packageCode: INDIVIDUAL_PLAN.code,
    });
    expect(typesFromPackageCode("PET_ID")).toEqual({
      productFamily: "PET_ID",
      occupancy: "INDIVIDUAL",
      packageCode: "PET_ID",
    });
    expect(typesFromPackageCode("CORP-10")).toEqual({
      productFamily: "DIGITAL_ID",
      occupancy: "CORPORATE",
      packageCode: "CORP-10",
    });
  });

  it("derives the three user types from the purchased package", () => {
    expect(typesFromSku(COMMERCIAL_SKUS.INITIAL).packageCode).toBe("INDIVIDUAL");
    expect(typesFromSku(COMMERCIAL_SKUS.PREMIUM)).toEqual({
      productFamily: "DIGITAL_ID",
      occupancy: "INDIVIDUAL",
      packageCode: INDIVIDUAL_PREMIUM_PLAN.code,
    });
    expect(packageCodeFromSku(COMMERCIAL_SKUS.PREMIUM_UPGRADE)).toBe("INDIVIDUAL_PREMIUM");
    expect(packageCodeFromSku(COMMERCIAL_SKUS.DIGITAL)).toBe("INDIVIDUAL_DIGITAL");
    expect(packageCodeFromSku("YENOMI-CORP-10")).toBe("CORP-10");
    expect(typesFromPackageCode("STARTER").packageCode).toBe("CORP-10");
    expect(typesFromPackageCode(null).packageCode).toBe(UNASSIGNED_PACKAGE_CODE);
  });

  it("maps commerce fulfillment kinds onto identity families", () => {
    expect(familyFromCommerceKind("NFC_PHYSICAL_CARD")).toBe("DIGITAL_ID");
    expect(familyFromCommerceKind("BUSINESS_CARD")).toBe("DIGITAL_ID");
    expect(familyFromCommerceKind("HEALTH_CARD")).toBe("EMERGENCY_ID");
    expect(familyFromCommerceKind("PET_ID")).toBe("PET_ID");
    expect(familyFromCommerceKind("VEHICLE_ID")).toBe("VEHICLE_ID");
  });

  it("does not treat TEST or Pet ID as a login occupancy", () => {
    expect(occupancyFromAccountType("INDIVIDUAL")).toBe("INDIVIDUAL");
    expect(occupancyFromAccountType("CORPORATE")).toBe("CORPORATE");
    expect(occupancyFromAccountType("TEST", "BOTH")).toBeNull();
    expect(occupancyFromAccountType("TEST", "INDIVIDUAL")).toBe("INDIVIDUAL");
  });

  it("catalogues every live corporate ladder and admin provision plan", () => {
    assertAdminProvisionPlansAreCatalogued();
    for (const row of CORPORATE_PACKAGE_LADDER) {
      expect(IDENTITY_PACKAGE_CATALOG.some((item) => item.code === row.code)).toBe(true);
    }
    expect(ADMIN_PROVISION_PLAN_CODES).toContain("DEMO-5");
    expect(packageCodeFromSku("YENOMI-CORP-4")).toBe("CORP-4");
    expect(IDENTITY_PACKAGE_CATALOG.find((row) => row.code === "CORP-4")?.live).toBe(false);
    expect(IDENTITY_PACKAGE_CATALOG.filter((row) => row.code === "PET_ID" && row.live)).toHaveLength(0);
  });
});
