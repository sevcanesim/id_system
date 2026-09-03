import { describe, expect, it } from "vitest";

import {
  getDigitalProfileState,
  getMemberLifecycleActions,
  getPhysicalCardState,
} from "./lifecycle";

describe("organization lifecycle", () => {
  it("gives a current active card precedence over a replaced historical card", () => {
    expect(getPhysicalCardState([
      { status: "ACTIVE", replacedByCardId: "new-card" },
      { status: "ACTIVE", ownerUserId: "member", activatedAt: "2026-01-01T00:00:00.000Z" },
    ])).toBe("ACTIVE");
  });

  it("derives disabled digital profiles from lifecycle status", () => {
    expect(getDigitalProfileState({
      hasDigitalCard: true,
      published: true,
      cardStatus: "SUSPENDED",
    })).toBe("DISABLED");
  });

  it("keeps invited members in invite-management actions", () => {
    expect(getMemberLifecycleActions({
      memberStatus: "INVITED",
      cards: [],
      invitationState: "PENDING",
    })).toEqual(["RESEND_INVITE", "REVOKE_INVITE"]);
  });
});
