import { describe, expect, it } from "vitest";

import { loadMysoftInvoicingConfiguration } from "./mysoft-config";

describe("loadMysoftInvoicingConfiguration", () => {
  it("keeps Mysoft invoice dispatch off until explicitly enabled", () => {
    expect(loadMysoftInvoicingConfiguration({
      MYSOFT_API_BASE_URL: "https://example.test/",
      MYSOFT_API_BEARER_TOKEN: "token",
      MYSOFT_TENANT_IDENTIFIER_NUMBER: "1234567890",
    })).toEqual({ enabled: false, ready: false, missing: [] });
  });

  it("does not allow a partially configured production dispatch", () => {
    expect(loadMysoftInvoicingConfiguration({ MYSOFT_INVOICING_ENABLED: "true" }))
      .toEqual({
        enabled: false,
        ready: false,
        missing: ["MYSOFT_API_BASE_URL", "MYSOFT_API_BEARER_TOKEN", "MYSOFT_TENANT_IDENTIFIER_NUMBER"],
      });
  });

  it("returns the dedicated issuer configuration only when all controls are present", () => {
    expect(loadMysoftInvoicingConfiguration({
      MYSOFT_INVOICING_ENABLED: "true",
      MYSOFT_API_BASE_URL: "https://mysoft.example.test/",
      MYSOFT_API_BEARER_TOKEN: "secret-token",
      MYSOFT_TENANT_IDENTIFIER_NUMBER: "1234567890",
    })).toEqual({
      enabled: true,
      ready: true,
      apiBaseUrl: "https://mysoft.example.test",
      bearerToken: "secret-token",
      tenantIdentifierNumber: "1234567890",
    });
  });
});
