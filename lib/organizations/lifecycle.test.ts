import { describe, expect, it } from "vitest";
import { currentLifecycleCards, getPhysicalCardState, getSeatBreakdown, memberConsumesSeat, physicalInventoryCounts, countMembersWithoutPhysicalAssignment } from "./lifecycle";

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

describe("memberConsumesSeat", () => {
  it("treats SUSPENDED as a consuming seat so reactivation does not buy a new license", () => {
    expect(memberConsumesSeat("ACTIVE")).toBe(true);
    expect(memberConsumesSeat("INVITED")).toBe(true);
    expect(memberConsumesSeat("SUSPENDED")).toBe(true);
    expect(memberConsumesSeat("LEFT")).toBe(false);
  });

  it("counts suspended members in used seats and exposes them in the breakdown", () => {
    expect(getSeatBreakdown([
      { role: "OWNER", status: "ACTIVE" },
      { role: "EMPLOYEE", status: "ACTIVE" },
      { role: "EMPLOYEE", status: "INVITED" },
      { role: "EMPLOYEE", status: "SUSPENDED" },
      { role: "EMPLOYEE", status: "LEFT" },
    ])).toEqual({
      used: 4,
      owners: 1,
      active: 1,
      invited: 1,
      suspended: 1,
      released: 1,
    });
  });

  it("QA-SEAT-01: a suspended member still occupies the last seat so a new invite has no capacity", () => {
    const seatLimit = 2;
    const breakdown = getSeatBreakdown([
      { role: "OWNER", status: "ACTIVE" },
      { role: "EMPLOYEE", status: "SUSPENDED" },
    ]);
    expect(breakdown.used).toBe(seatLimit);
    expect(breakdown.suspended).toBe(1);
    expect(seatLimit - breakdown.used).toBe(0);
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
