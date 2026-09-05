import { describe, expect, it } from "vitest";

import {
  debitNetworkMail,
  isDirectCheckoutBlocked,
  isNetworkMailCreditPackSku,
  recommendCorporatePack,
  resolveCorporatePlanCode,
} from "./packages";

describe("commercial packages", () => {
  it("maps legacy corporate codes to the live package ladder", () => {
    expect(resolveCorporatePlanCode("STARTER")).toBe("CORP-10");
    expect(recommendCorporatePack(26)).toMatchObject({ code: "CORP-50", seats: 50 });
  });

  it("allows fulfilled Network Mail packs but keeps campaign mail closed", () => {
    expect(isDirectCheckoutBlocked({ fulfillment_kind: "NETWORK_MAIL_CREDIT_PACK", live_checkout: true })).toBe(false);
    expect(isDirectCheckoutBlocked({ fulfillment_kind: "CAMPAIGN_MAIL_CREDIT_PACK" })).toBe(true);
    expect(isDirectCheckoutBlocked({ live_checkout: true })).toBe(false);
    expect(isNetworkMailCreditPackSku("YENOMI-NETWORK-MAIL-100")).toBe(true);
    expect(isNetworkMailCreditPackSku("YENOMI-CAMPAIGN-MAIL-1000")).toBe(false);
  });

  it("does not debit unavailable Network Mail credits", () => {
    expect(debitNetworkMail({ remaining: 4, recipientCount: 5, kind: "NETWORK" }))
      .toEqual({ ok: false, reason: "INSUFFICIENT_NETWORK_MAIL" });
  });
});
