import { describe, expect, it } from "vitest";
import { minimizeCoordinates } from "./coordinates";

describe("minimizeCoordinates", () => {
  it("retains valid coordinates at reduced precision", () => {
    expect(minimizeCoordinates(41.0082376, "28.9783589")).toEqual({
      latitude: 41.0082,
      longitude: 28.9784,
    });
  });

  it("rejects missing, invalid and out-of-range coordinates", () => {
    expect(minimizeCoordinates(null, null)).toBeNull();
    expect(minimizeCoordinates("", "28.9784")).toBeNull();
    expect(minimizeCoordinates("not-a-coordinate", "28.9784")).toBeNull();
    expect(minimizeCoordinates(90.001, 28.9784)).toBeNull();
  });
});
