import { describe, expect, it } from "vitest";
import { currentLifecycleCards, getPhysicalCardState, physicalInventoryCounts, countMembersWithoutPhysicalAssignment } from "./lifecycle";

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

describe("physical inventory vs member assignment", () => {
  it("does not treat a disabled assigned card as unassigned inventory or an unassigned member", () => {
    const cards = [
      { status: "DISABLED", ownerUserId: "user-1", activatedAt: "2026-01-01T00:00:00Z", replacedByCardId: null },
    ];
    expect(getPhysicalCardState(cards)).toBe("DISABLED");
    expect(physicalInventoryCounts(cards)).toEqual({
      total: 1,
      active: 0,
      awaitingAssignment: 0,
      disabled: 1,
      lost: 0,
    });
    expect(
      countMembersWithoutPhysicalAssignment(
        [{ status: "ACTIVE", user_id: "user-1" }, { status: "ACTIVE", user_id: "user-2" }],
        cards,
      ),
    ).toBe(1);
  });

  it("counts members without any physical card as unassigned", () => {
    expect(
      countMembersWithoutPhysicalAssignment(
        [{ status: "ACTIVE", user_id: "user-1" }, { status: "INVITED", user_id: "user-2" }],
        [],
      ),
    ).toBe(1);
  });
});
