import { describe, expect, it } from "vitest";
import { isTrustedSessionRestoreRequest, SESSION_RESTORE_HEADER } from "./http-only-session";

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
