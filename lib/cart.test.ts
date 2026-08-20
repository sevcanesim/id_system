import { describe, expect, it } from "vitest";
import { cartAddConflict, exclusiveCorporateCart, updateCartItemQuantity, type CartItem } from "./cart";
import { COMMERCIAL_SKUS } from "./config/commercial";
import { corporatePackageSku } from "./commerce/packages";

function item(partial: Partial<CartItem> & Pick<CartItem, "productId" | "name" | "kind">): CartItem {
  return {
    cartItemId: partial.cartItemId || "cart-1",
    productId: partial.productId,
    variantSku: partial.variantSku,
    kind: partial.kind,
    name: partial.name,
    unitPriceKurus: partial.unitPriceKurus ?? 79_900,
    quantity: partial.quantity ?? 1,
    configuration: partial.configuration,
  };
}

describe("exclusiveCorporateCart", () => {
  it("keeps individual NFC lines unchanged", () => {
    const items = [
      item({ productId: "nfc-kart", kind: "NFC_PHYSICAL_CARD", name: "NFC", variantSku: COMMERCIAL_SKUS.INITIAL, quantity: 2 }),
    ];
    expect(exclusiveCorporateCart(items)).toEqual(items);
  });

  it("replaces a mixed cart with the corporate package at quantity 1", () => {
    const corp = item({
      cartItemId: "corp",
      productId: "yenomi-business",
      kind: "NFC_PHYSICAL_CARD",
      name: "Kurumsal 10",
      variantSku: corporatePackageSku("CORP-10"),
      quantity: 3,
    });
    const nfc = item({
      cartItemId: "nfc",
      productId: "nfc-kart",
      kind: "NFC_PHYSICAL_CARD",
      name: "NFC",
      variantSku: COMMERCIAL_SKUS.INITIAL,
    });
    expect(exclusiveCorporateCart([nfc, corp])).toEqual([{ ...corp, quantity: 1 }]);
  });
});

describe("updateCartItemQuantity", () => {
  it("locks corporate package quantity at 1", () => {
    const items = [
      item({
        cartItemId: "corp",
        productId: "yenomi-business",
        kind: "NFC_PHYSICAL_CARD",
        name: "Kurumsal 10",
        variantSku: corporatePackageSku("CORP-10"),
      }),
    ];
    expect(updateCartItemQuantity(items, "corp", 4)[0].quantity).toBe(1);
  });
});

describe("cartAddConflict", () => {
  it("warns when a corporate pack would wipe individual lines", () => {
    const items = [
      item({ productId: "nfc-kart", kind: "NFC_PHYSICAL_CARD", name: "NFC", variantSku: COMMERCIAL_SKUS.INITIAL }),
    ];
    expect(cartAddConflict(corporatePackageSku("CORP-10"), items)).toBe("corporate-replaces-individual");
  });

  it("warns when an individual line would wipe a corporate pack", () => {
    const items = [
      item({
        productId: "yenomi-business",
        kind: "NFC_PHYSICAL_CARD",
        name: "Kurumsal 10",
        variantSku: corporatePackageSku("CORP-10"),
      }),
    ];
    expect(cartAddConflict(COMMERCIAL_SKUS.INITIAL, items)).toBe("individual-replaces-corporate");
  });

  it("is silent when the cart already matches the incoming kind", () => {
    const items = [
      item({ productId: "nfc-kart", kind: "NFC_PHYSICAL_CARD", name: "NFC", variantSku: COMMERCIAL_SKUS.INITIAL }),
    ];
    expect(cartAddConflict(COMMERCIAL_SKUS.ADDITIONAL_CARD, items)).toBeNull();
  });
});
