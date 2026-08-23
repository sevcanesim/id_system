import { COMMERCIAL_SKUS } from "../config/commercial";
import {
  ADMIN_PROVISION_PLAN_CODES,
  CORPORATE_PACKAGE_LADDER,
  INDIVIDUAL_DIGITAL_PLAN,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_PLAN,
  RETIRED_CORPORATE_PACKAGE_CODES,
  resolveCorporatePlanCode,
} from "../commerce/packages";
import type { AccountType, TestLoginScope } from "../auth/account-type";

/**
 * Three types stored on every user (and on every identity row they hold):
 * 1. identity product family — Digital ID, Pet ID, Emergency ID, …
 * 2. occupancy — bireysel / kurumsal
 * 3. package code — determined by the purchased/provisioned package
 *
 * Analytics (görüntülenme, QR tarama, link tıklama, CTA) is a measurement
 * layer on an identity, not a fourth user type.
 *
 * Commerce `product_kind` (NFC_PHYSICAL_CARD, PET_ID, …) stays the fulfillment
 * enum. This module is the user-facing identity taxonomy mapped from that
 * kind and from package_code. Coming-soon families are typed here so Pet ID
 * and later products can be attached to the same auth user without collapsing
 * Digital ID into a single boolean.
 */

export const IDENTITY_PRODUCT_FAMILIES = [
  "DIGITAL_ID",
  "BUSINESS_MINI_SITE",
  "RESTAURANT",
  "EMERGENCY_ID",
  "PET_ID",
  "VEHICLE_ID",
] as const;

export type IdentityProductFamily = (typeof IDENTITY_PRODUCT_FAMILIES)[number];

export const OCCUPANCY_KINDS = ["INDIVIDUAL", "CORPORATE"] as const;
export type OccupancyKind = (typeof OCCUPANCY_KINDS)[number];

export const UNASSIGNED_PACKAGE_CODE = "UNASSIGNED";

export const IDENTITY_FAMILY_LABELS: Record<IdentityProductFamily, { label: string; occupancies: readonly OccupancyKind[] }> = {
  DIGITAL_ID: { label: "Dijital Kartvizit", occupancies: ["INDIVIDUAL", "CORPORATE"] },
  BUSINESS_MINI_SITE: { label: "İşletme Mini Sitesi", occupancies: ["CORPORATE"] },
  RESTAURANT: { label: "Restoran", occupancies: ["INDIVIDUAL", "CORPORATE"] },
  EMERGENCY_ID: { label: "Acil Durum Kimliği", occupancies: ["INDIVIDUAL"] },
  PET_ID: { label: "Pet ID", occupancies: ["INDIVIDUAL"] },
  VEHICLE_ID: { label: "Vehicle ID", occupancies: ["INDIVIDUAL"] },
};

/** Measurement capabilities. Not stored as user identity types. */
export const IDENTITY_MEASUREMENT_CAPABILITIES = [
  "CARD_VIEW",
  "QR_SCAN",
  "LINK_CLICK",
  "CTA_CONVERSION",
] as const;

export type IdentityMeasurementCapability = (typeof IDENTITY_MEASUREMENT_CAPABILITIES)[number];

export type IdentityPackageRecord = {
  code: string;
  name: string;
  occupancy: OccupancyKind;
  productFamily: IdentityProductFamily;
  live: boolean;
};

const CORPORATE_LADDER_PACKAGES: IdentityPackageRecord[] = CORPORATE_PACKAGE_LADDER.map((row) => ({
  code: row.code,
  name: row.name,
  occupancy: "CORPORATE",
  productFamily: "DIGITAL_ID",
  live: true,
}));

const ADMIN_ONLY_PACKAGES: IdentityPackageRecord[] = [
  { code: "DEMO-2", name: "Demo 2", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: true },
  { code: "DEMO-5", name: "Demo 5", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: true },
  { code: "DEMO-10", name: "Demo 10", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: true },
  { code: "DEMO-50", name: "Demo QA 50", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: false },
  { code: "STARTER", name: "Starter (alias CORP-10)", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: false },
  { code: "GROWTH", name: "Growth (alias CORP-25)", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: false },
  { code: "BUSINESS", name: "Business (alias CORP-50)", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: false },
  { code: "ENTERPRISE", name: "Enterprise", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: false },
  { code: "CORP-4", name: "Kurumsal 4", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: false },
  { code: "CORP-20", name: "Kurumsal 20", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: false },
  { code: "CORP-75", name: "Kurumsal 75", occupancy: "CORPORATE", productFamily: "DIGITAL_ID", live: false },
];

const ROADMAP_PACKAGES: IdentityPackageRecord[] = [
  { code: "PET_ID", name: "Pet ID", occupancy: "INDIVIDUAL", productFamily: "PET_ID", live: false },
  { code: "EMERGENCY_ID", name: "Acil Durum Kimliği", occupancy: "INDIVIDUAL", productFamily: "EMERGENCY_ID", live: false },
  { code: "VEHICLE_ID", name: "Vehicle ID", occupancy: "INDIVIDUAL", productFamily: "VEHICLE_ID", live: false },
  { code: "BUSINESS_MINI_SITE", name: "İşletme Mini Sitesi", occupancy: "CORPORATE", productFamily: "BUSINESS_MINI_SITE", live: false },
  { code: "RESTAURANT", name: "Restoran", occupancy: "CORPORATE", productFamily: "RESTAURANT", live: false },
];

export const IDENTITY_PACKAGE_CATALOG: readonly IdentityPackageRecord[] = [
  {
    code: UNASSIGNED_PACKAGE_CODE,
    name: "Paket atanmadı",
    occupancy: "INDIVIDUAL",
    productFamily: "DIGITAL_ID",
    live: false,
  },
  {
    code: INDIVIDUAL_DIGITAL_PLAN.code,
    name: INDIVIDUAL_DIGITAL_PLAN.name,
    occupancy: "INDIVIDUAL",
    productFamily: "DIGITAL_ID",
    live: true,
  },
  {
    code: INDIVIDUAL_PLAN.code,
    name: INDIVIDUAL_PLAN.name,
    occupancy: "INDIVIDUAL",
    productFamily: "DIGITAL_ID",
    live: true,
  },
  {
    code: INDIVIDUAL_PREMIUM_PLAN.code,
    name: INDIVIDUAL_PREMIUM_PLAN.name,
    occupancy: "INDIVIDUAL",
    productFamily: "DIGITAL_ID",
    live: true,
  },
  ...CORPORATE_LADDER_PACKAGES,
  ...ADMIN_ONLY_PACKAGES,
  ...ROADMAP_PACKAGES,
];

const PACKAGE_BY_CODE = new Map(IDENTITY_PACKAGE_CATALOG.map((row) => [row.code, row]));

export function isIdentityProductFamily(value: string): value is IdentityProductFamily {
  return (IDENTITY_PRODUCT_FAMILIES as readonly string[]).includes(value);
}

export function isOccupancyKind(value: string): value is OccupancyKind {
  return (OCCUPANCY_KINDS as readonly string[]).includes(value);
}

export function identityPackageByCode(code: string | null | undefined): IdentityPackageRecord | null {
  if (!code) return null;
  return PACKAGE_BY_CODE.get(code) ?? PACKAGE_BY_CODE.get(resolveCorporatePlanCode(code)) ?? null;
}

export function typesFromPackageCode(code: string | null | undefined): {
  productFamily: IdentityProductFamily;
  occupancy: OccupancyKind;
  packageCode: string;
} {
  const resolved = code ? resolveCorporatePlanCode(code) : UNASSIGNED_PACKAGE_CODE;
  const row = identityPackageByCode(resolved) ?? PACKAGE_BY_CODE.get(UNASSIGNED_PACKAGE_CODE)!;
  return {
    productFamily: row.productFamily,
    occupancy: row.occupancy,
    packageCode: row.code,
  };
}

const COMMERCE_KIND_TO_FAMILY: Record<string, IdentityProductFamily> = {
  BUSINESS_CARD: "DIGITAL_ID",
  NFC_PHYSICAL_CARD: "DIGITAL_ID",
  HEALTH_CARD: "EMERGENCY_ID",
  PET_ID: "PET_ID",
  VEHICLE_ID: "VEHICLE_ID",
  BUSINESS_MINI_SITE: "BUSINESS_MINI_SITE",
  RESTAURANT: "RESTAURANT",
  EMERGENCY_ID: "EMERGENCY_ID",
};

export function familyFromCommerceKind(kind: string | null | undefined): IdentityProductFamily {
  if (!kind) return "DIGITAL_ID";
  return COMMERCE_KIND_TO_FAMILY[kind] ?? "DIGITAL_ID";
}

const SKU_TO_PACKAGE: Record<string, string> = {
  [COMMERCIAL_SKUS.DIGITAL]: INDIVIDUAL_DIGITAL_PLAN.code,
  [COMMERCIAL_SKUS.INITIAL]: INDIVIDUAL_PLAN.code,
  [COMMERCIAL_SKUS.RENEWAL]: INDIVIDUAL_PLAN.code,
  [COMMERCIAL_SKUS.PREMIUM]: INDIVIDUAL_PREMIUM_PLAN.code,
  [COMMERCIAL_SKUS.PREMIUM_RENEWAL]: INDIVIDUAL_PREMIUM_PLAN.code,
  [COMMERCIAL_SKUS.PREMIUM_UPGRADE]: INDIVIDUAL_PREMIUM_PLAN.code,
  ...Object.fromEntries(CORPORATE_PACKAGE_LADDER.map((row) => [`YENOMI-${row.code}`, row.code])),
  ...Object.fromEntries(RETIRED_CORPORATE_PACKAGE_CODES.map((code) => [`YENOMI-${code}`, code])),
};

export function packageCodeFromSku(sku: string | null | undefined): string {
  if (!sku) return UNASSIGNED_PACKAGE_CODE;
  return SKU_TO_PACKAGE[sku] ?? identityPackageByCode(sku)?.code ?? UNASSIGNED_PACKAGE_CODE;
}

export function typesFromSku(sku: string | null | undefined) {
  return typesFromPackageCode(packageCodeFromSku(sku));
}

/**
 * Login portal occupancy. TEST is not a product occupancy; it is an overlay
 * on bireysel/kurumsal. Pet ID is a product family, never an account_type.
 */
export function occupancyFromAccountType(
  accountType: AccountType,
  testScope?: TestLoginScope | null,
): OccupancyKind | null {
  if (accountType === "INDIVIDUAL") return "INDIVIDUAL";
  if (accountType === "CORPORATE") return "CORPORATE";
  if (accountType === "TEST") {
    if (testScope === "CORPORATE") return "CORPORATE";
    if (testScope === "INDIVIDUAL") return "INDIVIDUAL";
    return null;
  }
  return null;
}

export function assertAdminProvisionPlansAreCatalogued() {
  for (const code of ADMIN_PROVISION_PLAN_CODES) {
    if (!PACKAGE_BY_CODE.has(code) && !PACKAGE_BY_CODE.has(resolveCorporatePlanCode(code))) {
      throw new Error(`Admin plan ${code} is missing from IDENTITY_PACKAGE_CATALOG`);
    }
  }
}
