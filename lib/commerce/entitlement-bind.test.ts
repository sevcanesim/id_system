import { describe, expect, it } from "vitest";
import { unusedEntitlementId } from "./entitlement-bind";

describe("unusedEntitlementId", () => {
  it("returns the first entitlement that no profile has bound", () => {
    expect(
      unusedEntitlementId(
        [{ id: "ent-1" }, { id: "ent-2" }],
        [{ entitlement_id: "ent-1" }],
      ),
    ).toBe("ent-2");
  });

  it("returns null when every entitlement is already bound", () => {
    expect(
      unusedEntitlementId(
        [{ id: "ent-1" }],
        [{ entitlement_id: "ent-1" }],
      ),
    ).toBeNull();
  });

  it("treats a profile with no entitlement_id as not consuming a right", () => {
    expect(
      unusedEntitlementId(
        [{ id: "ent-1" }],
        [{ entitlement_id: null }, {}],
      ),
    ).toBe("ent-1");
  });
});
