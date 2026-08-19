import { describe, expect, it } from "vitest";
import {
  BUSINESS_SEAT_PACKS,
  CAMPAIGN_MAIL_PACKS,
  CAMPAIGN_MAIL_STAGE,
  CORPORATE_PACKAGE_LADDER,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_PLAN,
  NETWORK_MAIL_CREDIT_PACKS,
  NETWORK_MAIL_PER_SEAT_ANNUAL,
  assertNetworkDailyCap,
  debitNetworkMail,
  networkMailGrant,
  perSeatKurus,
  resolveCorporatePlanCode,
  defaultMailCreditLimit,
  prorateUpgradeKurus,
  recommendCorporatePack,
  rolloverNetworkMail,
  seatDecreasePolicy,
  upgradeDeltaKurus,
} from "./packages";

describe("networkMailGrant", () => {
  it("gives 100 Network Mail per seat per year", () => {
    expect(NETWORK_MAIL_PER_SEAT_ANNUAL).toBe(100);
    expect(networkMailGrant(1)).toBe(100);
    expect(networkMailGrant(5)).toBe(500);
    expect(networkMailGrant(10)).toBe(1000);
    expect(networkMailGrant(100)).toBe(10_000);
  });

  it("rejects invalid seat counts", () => {
    expect(() => networkMailGrant(0)).toThrow(RangeError);
    expect(() => networkMailGrant(2.5)).toThrow(RangeError);
  });
});

describe("corporate ladder", () => {
  it("does not price 10 seats the same as 5 seats", () => {
    const five = CORPORATE_PACKAGE_LADDER.find((row) => row.seats === 5)!;
    const ten = CORPORATE_PACKAGE_LADDER.find((row) => row.seats === 10)!;
    expect(five.priceKurus).toBe(550_000);
    expect(ten.priceKurus).toBe(990_000);
    expect(ten.priceKurus).toBeGreaterThan(five.priceKurus);
  });

  it("decreases per-seat price as pack size grows", () => {
    const perSeat = CORPORATE_PACKAGE_LADDER.map((row) => perSeatKurus(row.priceKurus, row.seats));
    for (let i = 1; i < perSeat.length; i += 1) {
      expect(perSeat[i]).toBeLessThan(perSeat[i - 1]);
    }
    expect(perSeat[perSeat.length - 1]).toBe(69_900);
  });

  it("grants 100 Network Mail per included seat", () => {
    for (const row of CORPORATE_PACKAGE_LADDER) {
      expect(networkMailGrant(row.seats)).toBe(row.seats * 100);
    }
  });

  it("maps legacy plan codes to the new ladder", () => {
    expect(resolveCorporatePlanCode("STARTER")).toBe("CORP-10");
    expect(resolveCorporatePlanCode("GROWTH")).toBe("CORP-25");
    expect(resolveCorporatePlanCode("BUSINESS")).toBe("CORP-50");
    expect(resolveCorporatePlanCode("CORP-10")).toBe("CORP-10");
  });
});

describe("individual plans", () => {
  it("keeps the 799 listing SKU cheaper than Premium", () => {
    expect(INDIVIDUAL_PLAN.priceKurus).toBe(79_900);
    expect(INDIVIDUAL_PREMIUM_PLAN.priceKurus).toBe(125_000);
    expect(INDIVIDUAL_PREMIUM_PLAN.networkMailCredits).toBe(100);
    expect(INDIVIDUAL_PLAN.networkMailCredits).toBe(0);
    expect(INDIVIDUAL_PREMIUM_PLAN.popular).toBe(true);
  });
});

describe("debitNetworkMail", () => {
  it("charges one credit per recipient, never per campaign", () => {
    expect(debitNetworkMail({ remaining: 100, recipientCount: 1, kind: "NETWORK" })).toEqual({
      ok: true,
      debit: 1,
      remaining: 99,
    });
    expect(debitNetworkMail({ remaining: 100, recipientCount: 2, kind: "NETWORK" })).toEqual({
      ok: true,
      debit: 2,
      remaining: 98,
    });
  });

  it("refuses Campaign Mail on the Network ledger", () => {
    expect(debitNetworkMail({ remaining: 100, recipientCount: 500, kind: "CAMPAIGN" })).toEqual({
      ok: false,
      reason: "CAMPAIGN_LEDGER_NOT_LIVE",
    });
  });

  it("blocks send when credits are insufficient", () => {
    expect(debitNetworkMail({ remaining: 1, recipientCount: 2, kind: "NETWORK" }).ok).toBe(false);
  });
});

describe("rolloverNetworkMail", () => {
  it("carries unused credits only when the package is renewed", () => {
    expect(rolloverNetworkMail({ unused: 37, newGrant: 100, renewed: true })).toEqual({
      remaining: 137,
      expired: 0,
    });
    expect(rolloverNetworkMail({ unused: 37, newGrant: 100, renewed: false })).toEqual({
      remaining: 0,
      expired: 37,
    });
  });
});

describe("daily cap", () => {
  it("caps Network Mail sends per day to limit abuse", () => {
    expect(assertNetworkDailyCap(149, 1)).toBe(true);
    expect(assertNetworkDailyCap(150, 1)).toBe(false);
  });
});

describe("credit packs", () => {
  it("lists Network Mail add-ons separately from Campaign Mail", () => {
    expect(NETWORK_MAIL_CREDIT_PACKS.map((row) => row.credits)).toEqual([100, 500, 1000, 5000]);
    expect(NETWORK_MAIL_CREDIT_PACKS[0]?.priceKurus).toBe(14_900);
    expect(CAMPAIGN_MAIL_STAGE).toBe("COMING_SOON");
    expect(CAMPAIGN_MAIL_PACKS[0]?.credits).toBe(1000);
  });
});

describe("seat top-ups vs official packs", () => {
  it("keeps a 5-seat top-up from undercutting 5 → 10 pack upgrade", () => {
    const delta = upgradeDeltaKurus(5, 10);
    const fivePack = BUSINESS_SEAT_PACKS.find((row) => row.seats === 5)!;
    expect(delta).toBe(440_000);
    expect(fivePack.priceKurus).toBeGreaterThanOrEqual(delta!);
    expect(fivePack.sku).toBe("YENOMI-BUSINESS-SEATS-5");
  });
});

describe("missing commercial algorithms", () => {
  it("defaults Network Mail grant to 100 per seat unless overridden", () => {
    expect(defaultMailCreditLimit(10)).toBe(1000);
    expect(defaultMailCreditLimit(10, 2500)).toBe(2500);
  });

  it("recommends the smallest pack that covers the headcount", () => {
    expect(recommendCorporatePack(1).code).toBe("CORP-2");
    expect(recommendCorporatePack(10).code).toBe("CORP-10");
    expect(recommendCorporatePack(11).code).toBe("CORP-20");
    expect(recommendCorporatePack(101).code).toBe("ENTERPRISE");
  });

  it("prorates pack upgrades by remaining term days", () => {
    expect(prorateUpgradeKurus({ fromSeats: 5, toSeats: 10, daysRemaining: 182, termDays: 365 })).toBe(
      Math.round(440_000 * (182 / 365)),
    );
  });

  it("does not refund mid-term seat decreases", () => {
    expect(seatDecreasePolicy({ currentSeats: 10, requestedSeats: 5 })).toEqual({
      allowedNow: false,
      refundKurus: 0,
      applyAtRenewal: true,
      reason: "MID_TERM_DECREASE_NOT_REFUNDED",
    });
  });
});
