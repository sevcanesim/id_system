import { describe, expect, it } from "vitest";
import { currentLifecycleCards, getPhysicalCardState } from "./lifecycle";

describe("getPhysicalCardState", () => {
  it("treats a current assigned card as assigned even when an older card was replaced", () => {
    const cards = [
      { status: "LOST", ownerUserId: "user-1", activatedAt: "2026-01-01T00:00:00Z", replacedByCardId: "card-new" },
      { status: "ACTIVE", ownerUserId: "user-1", activatedAt: "2026-06-01T00:00:00Z", replacedByCardId: null },
      { status: "ACTIVE", ownerUserId: "user-1", activatedAt: "2026-03-01T00:00:00Z", replacedByCardId: null },
    ];
    expect(getPhysicalCardState(cards)).toBe("ACTIVE");
    expect(currentLifecycleCards(cards)).toHaveLength(2);
  });

  it("returns REPLACED only when every card has been superseded", () => {
    const cards = [
      { status: "LOST", ownerUserId: "user-1", activatedAt: "2026-01-01T00:00:00Z", replacedByCardId: "card-new" },
    ];
    expect(getPhysicalCardState(cards)).toBe("REPLACED");
  });

  it("returns UNASSIGNED when there are no cards", () => {
    expect(getPhysicalCardState([])).toBe("UNASSIGNED");
  });
});
