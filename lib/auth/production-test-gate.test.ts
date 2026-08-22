import { afterEach, describe, expect, it } from "vitest";
import {
  isBlockedTestIdentity,
  isYenomiTestEmail,
  productionTestLoginBlocked,
  shouldBlockTestLogins,
} from "./production-test-gate";

const original = {
  vercelEnv: process.env.VERCEL_ENV,
  allow: process.env.ALLOW_TEST_LOGINS,
  block: process.env.YENOMI_BLOCK_TEST_LOGINS,
};

function restoreEnv(name: "VERCEL_ENV" | "ALLOW_TEST_LOGINS" | "YENOMI_BLOCK_TEST_LOGINS", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  restoreEnv("VERCEL_ENV", original.vercelEnv);
  restoreEnv("ALLOW_TEST_LOGINS", original.allow);
  restoreEnv("YENOMI_BLOCK_TEST_LOGINS", original.block);
});

describe("production test-account gate", () => {
  it("recognizes the demo email domain regardless of case", () => {
    expect(isYenomiTestEmail("demo.superadmin@yenomi.test")).toBe(true);
    expect(isYenomiTestEmail("Demo.Bireysel.Aktif@Yenomi.TEST")).toBe(true);
    expect(isYenomiTestEmail("user@yenomi.com")).toBe(false);
    expect(isYenomiTestEmail(null)).toBe(false);
  });

  it("blocks TEST occupancy even when the email is not a fixture domain", () => {
    expect(isBlockedTestIdentity({ email: "ops@example.com", accountType: "TEST" })).toBe(true);
    expect(isBlockedTestIdentity({ email: "ops@example.com", accountType: "INDIVIDUAL" })).toBe(false);
  });

  it("blocks on Vercel production unless ALLOW_TEST_LOGINS is set", () => {
    process.env.VERCEL_ENV = "production";
    delete process.env.ALLOW_TEST_LOGINS;
    delete process.env.YENOMI_BLOCK_TEST_LOGINS;
    expect(shouldBlockTestLogins()).toBe(true);
    expect(productionTestLoginBlocked({ email: "demo.bireysel.aktif@yenomi.test" })).toBe(true);

    process.env.ALLOW_TEST_LOGINS = "true";
    expect(shouldBlockTestLogins()).toBe(false);
    expect(productionTestLoginBlocked({ email: "demo.bireysel.aktif@yenomi.test" })).toBe(false);
  });

  it("leaves preview and local runtimes open for fixtures", () => {
    process.env.VERCEL_ENV = "preview";
    delete process.env.ALLOW_TEST_LOGINS;
    delete process.env.YENOMI_BLOCK_TEST_LOGINS;
    expect(shouldBlockTestLogins()).toBe(false);

    delete process.env.VERCEL_ENV;
    expect(shouldBlockTestLogins()).toBe(false);
  });

  it("can force the gate on a non-production deployment", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.YENOMI_BLOCK_TEST_LOGINS = "true";
    expect(shouldBlockTestLogins()).toBe(true);
  });
});
