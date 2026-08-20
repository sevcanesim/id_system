import { describe, expect, it } from "vitest";
import { corporatePackageSku } from "./packages";
import { commerceOrderIsCorporate } from "./order-kind";
import { COMMERCIAL_SKUS } from "../config/commercial";

describe("commerceOrderIsCorporate", () => {
  it("detects a corporate package from order-item configuration", () => {
    expect(commerceOrderIsCorporate([{ configuration: { sku: corporatePackageSku("CORP-10") } }])).toBe(true);
  });

  it("does not treat individual NFC checkout as corporate", () => {
    expect(commerceOrderIsCorporate([{ configuration: { sku: COMMERCIAL_SKUS.INITIAL } }])).toBe(false);
    expect(commerceOrderIsCorporate([])).toBe(false);
  });
});
