import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, isPublicIp, locationFromPlatformHeaders, normalizeClientIp } from "./request-ip";

describe("normalizeClientIp", () => {
  it("takes the first forwarded address and unwraps IPv4-mapped IPv6", () => {
    expect(normalizeClientIp("::ffff:203.0.113.10, 10.0.0.1")).toBe("203.0.113.10");
  });

  it("treats loopback as empty so localhost never invents a city", () => {
    expect(normalizeClientIp("::1")).toBe("");
    expect(isPublicIp("127.0.0.1")).toBe(false);
    expect(isPublicIp("10.1.2.3")).toBe(false);
    expect(isPublicIp("203.0.113.10")).toBe(true);
  });
});

describe("locationFromPlatformHeaders", () => {
  it("reads Vercel geo headers without calling an external service", () => {
    const headers = new Headers({
      "x-vercel-ip-city": "Istanbul",
      "x-vercel-ip-country": "TR",
      "x-vercel-ip-country-region": "34",
    });
    expect(locationFromPlatformHeaders(headers)).toEqual({
      city: "Istanbul",
      district: "34",
      addressLine: "Istanbul, TR",
    });
  });

  it("returns null when the platform did not attach geo headers", () => {
    expect(locationFromPlatformHeaders(new Headers())).toBeNull();
  });
});

describe("clientIpFromHeaders", () => {
  it("prefers Cloudflare connecting IP over forwarded-for", () => {
    const headers = new Headers({
      "cf-connecting-ip": "198.51.100.20",
      "x-forwarded-for": "10.0.0.8",
    });
    expect(clientIpFromHeaders(headers)).toBe("198.51.100.20");
  });
});
