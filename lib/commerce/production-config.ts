import { COMMERCIAL_SKUS, isCorporatePackageSku, isPhysicalBundleSku } from "../config/commercial";

export function needsPhysicalProductionStamp(sku: string | undefined): boolean {
  return isPhysicalBundleSku(sku) || isCorporatePackageSku(sku) || sku === COMMERCIAL_SKUS.ADDITIONAL_CARD || sku === COMMERCIAL_SKUS.REPLACEMENT_CARD;
}

export function stampPhysicalProductionConfig(
  sku: string | undefined,
  configuration: Record<string, unknown> | undefined,
  customerName: string,
): Record<string, unknown> {
  const next = { ...(configuration || {}) };
  if (!needsPhysicalProductionStamp(sku)) return next;
  const existingName = typeof next.printName === "string" ? next.printName.trim() : "";
  next.printName = existingName.length >= 2 ? existingName : customerName.trim();
  if (typeof next.printTitle !== "string") next.printTitle = "";
  next.cardColor = "BLACK";
  return next;
}
