import { describe, expect, it } from "vitest";
import { requestIp } from "./rate-limit";

describe("requestIp", () => {
  it("prefers Cloudflare's connecting IP", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.7",
      "x-real-ip": "198.51.100.8",
      "x-forwarded-for": "1.2.3.4, 192.0.2.9",
    });
    expect(requestIp(headers)).toBe("203.0.113.7");
  });

  it("uses x-real-ip before forwarded chains", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.8",
      "x-forwarded-for": "1.2.3.4, 192.0.2.9",
    });
    expect(requestIp(headers)).toBe("198.51.100.8");
  });

  it("uses the rightmost valid forwarded address instead of client-prepended values", () => {
    const headers = new Headers({
      "x-forwarded-for": "6.6.6.6, 203.0.113.20, 192.0.2.9",
    });
    expect(requestIp(headers)).toBe("192.0.2.9");
  });

  it("rejects malformed header values", () => {
    const headers = new Headers({
      "cf-connecting-ip": "attacker-controlled",
      "x-forwarded-for": "also-bad",
    });
    expect(requestIp(headers)).toBe("unknown");
  });
});
