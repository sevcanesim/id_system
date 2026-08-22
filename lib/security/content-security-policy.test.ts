import { describe, expect, it } from "vitest";
import { buildContentSecurityPolicy } from "./content-security-policy";

describe("content security policy", () => {
  it("uses a per-request nonce and does not allow inline scripts", () => {
    const csp = buildContentSecurityPolicy("test-nonce");
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("keeps unsafe-eval off unless an explicit development opt-in is passed", () => {
    const production = buildContentSecurityPolicy("n", { allowUnsafeEval: false });
    const development = buildContentSecurityPolicy("n", { allowUnsafeEval: true });
    expect(production).not.toContain("'unsafe-eval'");
    expect(development).toContain("'unsafe-eval'");
  });
});
