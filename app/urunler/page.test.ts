import React from "react";
import { describe, expect, it } from "vitest";
import ProductsPage, { metadata } from "./page";
import {
  ADDITIONAL_CARD_FEATURES,
  ADDITIONAL_CARD_PLAN,
  INDIVIDUAL_CATALOG_POINTS,
  INDIVIDUAL_DIGITAL_CATALOG_POINTS,
  INDIVIDUAL_DIGITAL_PLAN,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_CATALOG_POINTS,
  INDIVIDUAL_PREMIUM_PLAN,
} from "../../lib/commerce/packages";
import { COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "../../lib/config/commercial";
import { formatTryFromKurus, NFC_PRODUCT } from "../../lib/config/product";

// Set global React for Vitest JSX execution
(globalThis as unknown as { React: typeof React }).React = React;

describe("ProductsPage (/urunler metadata & contract)", () => {
  it("exports correct page metadata title and description", () => {
    expect(metadata.title).toBe("Yenomi ID — NFC Dijital Kartvizit");
    expect(metadata.description).toContain("Yenomi ID ile NFC + QR kartınızı tek bir canlı dijital profile bağlayın");
  });

  it("references canonical catalog plan prices and SKUs", () => {
    // Dijital (₺799)
    expect(INDIVIDUAL_DIGITAL_PLAN.priceKurus).toBe(79900);
    expect(COMMERCIAL_PRICING.YENOMI_ID_DIGITAL.priceKurus).toBe(79900);
    expect(COMMERCIAL_SKUS.DIGITAL).toBe("YENOMI-DIGITAL-ANNUAL");
    expect(formatTryFromKurus(INDIVIDUAL_DIGITAL_PLAN.priceKurus)).toBe("₺799");

    // NFC (₺1.490)
    expect(INDIVIDUAL_PLAN.priceKurus).toBe(149000);
    expect(COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus).toBe(149000);
    expect(COMMERCIAL_SKUS.INITIAL).toBe("YENOMI-NFC-CARD-ANNUAL");
    expect(formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus)).toBe("₺1.490");

    // Premium (₺2.490)
    expect(INDIVIDUAL_PREMIUM_PLAN.priceKurus).toBe(249000);
    expect(COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus).toBe(249000);
    expect(COMMERCIAL_SKUS.PREMIUM).toBe("YENOMI-NFC-PREMIUM-ANNUAL");
    expect(formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus)).toBe("₺2.490");

    // Yedek Kart (₺399)
    expect(ADDITIONAL_CARD_PLAN.priceKurus).toBe(39900);
    expect(COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus).toBe(39900);
    expect(COMMERCIAL_SKUS.ADDITIONAL_CARD).toBe("YENOMI-NFC-EXTRA");
    expect(formatTryFromKurus(ADDITIONAL_CARD_PLAN.priceKurus)).toBe("₺399");
  });

  it("defines features for all catalog plans", () => {
    expect(INDIVIDUAL_DIGITAL_CATALOG_POINTS.length).toBeGreaterThan(0);
    expect(INDIVIDUAL_CATALOG_POINTS.length).toBeGreaterThan(0);
    expect(INDIVIDUAL_PREMIUM_CATALOG_POINTS.length).toBeGreaterThan(0);
    expect(ADDITIONAL_CARD_FEATURES.length).toBeGreaterThan(0);
    expect(NFC_PRODUCT.slug).toBe("nfc-kart");
  });

  it("renders React element tree cleanly without throwing", () => {
    const element = ProductsPage();
    expect(element).toBeDefined();
    expect(element.type).toBe("div");
    expect(element.props.className).toContain("products-commerce-v3");
  });
});
