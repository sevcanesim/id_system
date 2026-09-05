export const iyzicoConfig = {
  apiKey: process.env.IYZICO_API_KEY ?? "",
  secretKey: process.env.IYZICO_SECRET_KEY ?? "",
  baseUrl: process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com",
};

export const paytrConfig = {
  merchantId: process.env.PAYTR_MERCHANT_ID ?? "",
  merchantKey: process.env.PAYTR_MERCHANT_KEY ?? "",
  merchantSalt: process.env.PAYTR_MERCHANT_SALT ?? "",
  testMode: process.env.PAYTR_TEST_MODE === "true",
};

export const isIyzicoConfigured = Boolean(
  iyzicoConfig.apiKey && iyzicoConfig.secretKey && iyzicoConfig.baseUrl,
);

export const isPaytrConfigured = Boolean(
  paytrConfig.merchantId && paytrConfig.merchantKey && paytrConfig.merchantSalt,
);

export type ActivePaymentProvider = "PAYTR" | "IYZICO";

/**
 * PayTR is the preferred provider because its hosted payment flow does not
 * require a Turkish identity number. iyzico remains a safe fallback until
 * the PayTR merchant credentials are configured in the deployment.
 */
export function getActivePaymentProvider(): ActivePaymentProvider | null {
  if (isPaytrConfigured) return "PAYTR";
  if (isIyzicoConfigured) return "IYZICO";
  return null;
}

export function publicPaymentProviderConfig() {
  const provider = getActivePaymentProvider();
  return {
    provider,
    identityNumberRequired: provider === "IYZICO",
  };
}

export const publicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
