import { describe, expect, it } from "vitest";
import { checkoutCartSignature } from "./checkout-browser-draft";

describe("checkoutCartSignature", () => {
  it("tracks the purchasable line and corporate target without retaining buyer data", () => {
    const signature = checkoutCartSignature([{
      cartItemId: "line-1",
      productId: "nfc-card",
      variantSku: "YENOMI-NFC-INITIAL",
      kind: "NFC_PHYSICAL_CARD",
      name: "NFC Kart",
      unitPriceKurus: 149000,
      quantity: 1,
      configuration: { organizationId: "org-1", ignored: "value" },
    }]);

    expect(signature).toContain("nfc-card");
    expect(signature).toContain("org-1");
    expect(signature).not.toContain("line-1");
    expect(signature).not.toContain("ignored");
  });
});
