import { describe, expect, it } from "vitest";

import {
  debitNetworkMail,
  isDirectCheckoutBlocked,
  recommendCorporatePack,
  resolveCorporatePlanCode,
} from "./packages";

describe("commercial packages", () => {
  it("maps legacy corporate codes to the live package ladder", () => {
    expect(resolveCorporatePlanCode("STARTER")).toBe("CORP-10");
    expect(recommendCorporatePack(26)).toMatchObject({ code: "CORP-50", seats: 50 });
  });

  it("blocks unfulfilled credit-pack checkout metadata", () => {
    expect(isDirectCheckoutBlocked({ fulfillment_kind: "NETWORK_MAIL_CREDIT_PACK" })).toBe(true);
    expect(isDirectCheckoutBlocked({ live_checkout: true })).toBe(false);
  });

  it("does not debit unavailable Network Mail credits", () => {
    expect(debitNetworkMail({ remaining: 4, recipientCount: 5, kind: "NETWORK" }))
      .toEqual({ ok: false, reason: "INSUFFICIENT_NETWORK_MAIL" });
  });
});
