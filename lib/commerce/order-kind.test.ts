import { describe, expect, it } from "vitest";
import { corporatePackageSku, isSeatPackSku } from "./packages";
import {
  commerceOrderCorporateReady,
  commerceOrderIsCorporate,
  commerceOrderIsSeatPack,
  deriveSeatPackFulfillmentState,
} from "./order-kind";
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

describe("commerceOrderCorporateReady", () => {
  it("is false until every corporate line has an organizationId", () => {
    expect(commerceOrderCorporateReady([{ configuration: { sku: corporatePackageSku("CORP-10") } }])).toBe(false);
    expect(commerceOrderCorporateReady([{
      configuration: { sku: corporatePackageSku("CORP-10"), organizationId: "org-1" },
    }])).toBe(true);
  });

  it("is false for individual orders", () => {
    expect(commerceOrderCorporateReady([{ configuration: { sku: COMMERCIAL_SKUS.INITIAL } }])).toBe(false);
  });
});

describe("commerceOrderIsSeatPack", () => {
  it("detects a seat pack from SKU or configuration", () => {
    expect(isSeatPackSku("YENOMI-BUSINESS-SEATS-1")).toBe(true);
    expect(isSeatPackSku("YENOMI-BUSINESS-SEATS-2")).toBe(true);
    expect(isSeatPackSku("YENOMI-BUSINESS-SEATS-3")).toBe(true);
    expect(isSeatPackSku("YENOMI-BUSINESS-SEATS-5")).toBe(true);
    expect(isSeatPackSku("YENOMI-BUSINESS-SEATS-10")).toBe(true);
    expect(isSeatPackSku("YENOMI-NFC-CARD-ANNUAL")).toBe(false);

    expect(commerceOrderIsSeatPack([{ configuration: { sku: "YENOMI-BUSINESS-SEATS-1" } }])).toBe(true);
    expect(commerceOrderIsSeatPack([{ configuration: { organizationId: "123e4567-e89b-12d3-a456-426614174000", seatCount: 3 } }])).toBe(true);
  });

  it("returns false for non-seat-pack orders", () => {
    expect(commerceOrderIsSeatPack([{ configuration: { sku: COMMERCIAL_SKUS.INITIAL } }])).toBe(false);
    expect(commerceOrderIsSeatPack([{ configuration: { sku: corporatePackageSku("CORP-10") } }])).toBe(false);
    expect(commerceOrderIsSeatPack([])).toBe(false);
  });
});

describe("deriveSeatPackFulfillmentState", () => {
  it("A: evaluates FAILED -> FULFILLED as FULFILLED (newest event is FULFILLED)", () => {
    expect(
      deriveSeatPackFulfillmentState(true, [
        { action: "SEAT_PACK_FULFILLED" },
        { action: "SEAT_PACK_FULFILLMENT_FAILED" },
      ]),
    ).toBe("FULFILLED");
  });

  it("B: evaluates FULFILLED -> FAILED as FAILED (newest event is FAILED)", () => {
    expect(
      deriveSeatPackFulfillmentState(true, [
        { action: "SEAT_PACK_FULFILLMENT_FAILED" },
        { action: "SEAT_PACK_FULFILLED" },
      ]),
    ).toBe("FAILED");
  });

  it("C: returns PENDING when paid seat pack has no relevant fulfillment audit record yet", () => {
    expect(deriveSeatPackFulfillmentState(true, [])).toBe("PENDING");
    expect(deriveSeatPackFulfillmentState(true, null)).toBe("PENDING");
  });

  it("D: ignores unrelated audit actions and finds newest relevant event", () => {
    expect(
      deriveSeatPackFulfillmentState(true, [
        { action: "UNRELATED_AUDIT_LOG" },
        { action: "SEAT_PACK_FULFILLED" },
      ]),
    ).toBe("FULFILLED");

    expect(
      deriveSeatPackFulfillmentState(true, [
        { action: "UNRELATED_AUDIT_LOG" },
        { action: "SEAT_PACK_FULFILLMENT_FAILED" },
      ]),
    ).toBe("FAILED");
  });

  it("E: returns null for non-seat-pack orders regardless of audit log", () => {
    expect(deriveSeatPackFulfillmentState(false, [{ action: "SEAT_PACK_FULFILLED" }])).toBe(null);
    expect(deriveSeatPackFulfillmentState(false, [])).toBe(null);
  });
});
