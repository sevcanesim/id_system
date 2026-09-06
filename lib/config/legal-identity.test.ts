import { afterEach, describe, expect, it, vi } from "vitest";
import { getLegalIdentity, VERIFIED_YENOMI_IDENTITY } from "./legal-identity";

describe("getLegalIdentity", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("does not allow stale deployment values to replace the verified identity", () => {
    vi.stubEnv("BRAND_NAME", "Opsola");
    vi.stubEnv("BRAND_LINE", "Opsola platformu");
    vi.stubEnv("LEGAL_TRADE_NAME", "Yenomilabs Teknoloji A.Ş.");
    vi.stubEnv("LEGAL_ENTITY_TYPE", "Anonim şirket");

    expect(getLegalIdentity()).toMatchObject(VERIFIED_YENOMI_IDENTITY);
  });
});
