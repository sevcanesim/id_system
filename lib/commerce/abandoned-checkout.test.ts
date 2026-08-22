import { describe, expect, it } from "vitest";
import { abandonedEventType, classifyAbandonedWave } from "./abandoned-checkout";

const now = Date.parse("2026-08-22T12:00:00.000Z");

describe("classifyAbandonedWave", () => {
  it("skips in-flight pending attempts and brand-new checkouts", () => {
    expect(classifyAbandonedWave({
      createdAt: "2026-08-22T11:30:00.000Z",
      now,
      hasRecentPendingAttempt: false,
      sentFirst: false,
      sentDay: false,
    })).toBeNull();
    expect(classifyAbandonedWave({
      createdAt: "2026-08-22T08:00:00.000Z",
      now,
      hasRecentPendingAttempt: true,
      sentFirst: false,
      sentDay: false,
    })).toBeNull();
  });

  it("sends the first reminder after two hours and the day reminder after 24 hours", () => {
    expect(classifyAbandonedWave({
      createdAt: "2026-08-22T09:00:00.000Z",
      now,
      hasRecentPendingAttempt: false,
      sentFirst: false,
      sentDay: false,
    })).toBe("first");
    expect(classifyAbandonedWave({
      createdAt: "2026-08-21T10:00:00.000Z",
      now,
      hasRecentPendingAttempt: false,
      sentFirst: true,
      sentDay: false,
    })).toBe("day");
    expect(abandonedEventType("first")).toBe("ABANDONED_CHECKOUT");
    expect(abandonedEventType("day")).toBe("ABANDONED_CHECKOUT_24H");
  });
});
