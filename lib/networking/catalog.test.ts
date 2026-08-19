import { describe, expect, it } from "vitest";
import { detectNetworkingLocale, meetingRequiresPlanning, scoreLead } from "./catalog";

describe("networking catalog", () => {
  it("defaults browser language to English unless Turkish is present", () => {
    expect(detectNetworkingLocale("en-US,en;q=0.9")).toBe("en");
    expect(detectNetworkingLocale("tr-TR,tr;q=0.9,en;q=0.8")).toBe("tr");
  });

  it("requires planning for in-person meetings outside İzmir", () => {
    expect(meetingRequiresPlanning("İzmir", "Türkiye", "IN_PERSON")).toBe(false);
    expect(meetingRequiresPlanning("İstanbul", "Türkiye", "IN_PERSON")).toBe(true);
    expect(meetingRequiresPlanning("Berlin", "Germany", "IN_PERSON")).toBe(true);
    expect(meetingRequiresPlanning("Berlin", "Germany", "ONLINE")).toBe(false);
  });

  it("scores partnership and meeting signals", () => {
    expect(scoreLead(["QR_SCAN", "CONTACT_SHARED", "MEETING_REQUESTED"], ["Partnership"])).toBe(65);
  });
});
