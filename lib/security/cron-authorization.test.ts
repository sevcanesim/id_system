import { afterEach, describe, expect, it, vi } from "vitest";
import { authorizeCommerceCron } from "./cron-authorization";

afterEach(() => {
  vi.unstubAllEnvs();
});

function requestWith(headers: Record<string, string>) {
  return new Request("https://yenomi.test/api/cron/commerce-ops", { headers });
}

describe("authorizeCommerceCron", () => {
  it("accepts the Vercel bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "ops-secret");
    expect(authorizeCommerceCron(requestWith({ authorization: "Bearer ops-secret" }))).toBe(true);
    expect(authorizeCommerceCron(requestWith({ "x-cron-secret": "ops-secret" }))).toBe(true);
    expect(authorizeCommerceCron(requestWith({ authorization: "Bearer other" }))).toBe(false);
  });

  it("refuses production when the secret is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "");
    expect(authorizeCommerceCron(requestWith({}))).toBe(false);
  });
});
