export const paytrConfig = {
  merchantId: process.env.PAYTR_MERCHANT_ID ?? "",
  merchantKey: process.env.PAYTR_MERCHANT_KEY ?? "",
  merchantSalt: process.env.PAYTR_MERCHANT_SALT ?? "",
  testMode: process.env.PAYTR_TEST_MODE === "true",
};

export const isPaytrConfigured = Boolean(
  paytrConfig.merchantId && paytrConfig.merchantKey && paytrConfig.merchantSalt,
);

export type ActivePaymentProvider = "PAYTR";

/**
 * PayTR is Yenomi's sole hosted payment provider. A payment page never asks
 * the customer for a Turkish identity number and provider choice cannot be
 * changed through an environment override.
 */
export function getActivePaymentProvider(): ActivePaymentProvider | null {
  return isPaytrConfigured ? "PAYTR" : null;
}

export function publicPaymentProviderConfig() {
  const provider = getActivePaymentProvider();
  return {
    provider,
    identityNumberRequired: false,
  };
}

export const publicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
