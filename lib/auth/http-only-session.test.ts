import { describe, expect, it } from "vitest";
import { isTrustedSessionRestoreRequest, jwtExpiresAt, jwtSubject, SESSION_RESTORE_HEADER } from "./http-only-session";

function unsignedJwt(payload: Record<string, unknown>) {
  const json = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${json}.sig`;
}

function headers(init: Record<string, string>) {
  return new Headers(init);
}

describe("isTrustedSessionRestoreRequest", () => {
  it("rejects a top-level document navigation even with cookies", () => {
    expect(isTrustedSessionRestoreRequest(headers({
      [SESSION_RESTORE_HEADER]: "1",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
    }))).toBe(false);
  });

  it("rejects same-origin fetch without the restore header", () => {
    expect(isTrustedSessionRestoreRequest(headers({
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
    }))).toBe(false);
  });

  it("accepts the in-app restore fetch", () => {
    expect(isTrustedSessionRestoreRequest(headers({
      [SESSION_RESTORE_HEADER]: "1",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
    }))).toBe(true);
  });
});

describe("jwt payload helpers", () => {
  it("reads a UUID subject and numeric expiry", () => {
    const token = unsignedJwt({
      sub: "550e8400-e29b-41d4-a716-446655440000",
      exp: 1_900_000_000,
    });
    expect(jwtSubject(token)).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(jwtExpiresAt(token)).toBe(1_900_000_000);
  });

  it("rejects a non-UUID subject", () => {
    expect(jwtSubject(unsignedJwt({ sub: "not-a-user" }))).toBeNull();
    expect(jwtSubject("not-a-jwt")).toBeNull();
  });
});
