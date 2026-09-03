const REQUIRED_MYSOFT_ENV = [
  "MYSOFT_API_BASE_URL",
  "MYSOFT_API_BEARER_TOKEN",
  "MYSOFT_TENANT_IDENTIFIER_NUMBER",
] as const;

export type MysoftInvoicingConfiguration =
  | { enabled: false; ready: false; missing: readonly string[] }
  | {
    enabled: true;
    ready: true;
    apiBaseUrl: string;
    bearerToken: string;
    tenantIdentifierNumber: string;
  };

/**
 * Invoice dispatch is deliberately opt-in. A paid order may be queued before
 * credentials are supplied, but no third-party invoice request can be made
 * until the dedicated Yenomi Mysoft account is complete.
 */
export function loadMysoftInvoicingConfiguration(
  environment: Record<string, string | undefined> = process.env,
): MysoftInvoicingConfiguration {
  const enabled = environment.MYSOFT_INVOICING_ENABLED?.trim().toLowerCase() === "true";
  const missing = REQUIRED_MYSOFT_ENV.filter((name) => !environment[name]?.trim());

  if (!enabled || missing.length > 0) return { enabled: false, ready: false, missing };

  return {
    enabled: true,
    ready: true,
    apiBaseUrl: environment.MYSOFT_API_BASE_URL!.trim().replace(/\/$/, ""),
    bearerToken: environment.MYSOFT_API_BEARER_TOKEN!.trim(),
    tenantIdentifierNumber: environment.MYSOFT_TENANT_IDENTIFIER_NUMBER!.trim(),
  };
}
