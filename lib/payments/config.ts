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

function requestedPaymentProvider() {
  const value = process.env.PAYMENT_PROVIDER?.trim().toUpperCase();
  return value === "PAYTR" || value === "IYZICO" ? value : null;
}

/**
 * Yenomi's supported hosted checkout is PayTR, so a payment page never asks
 * the customer for a Turkish identity number. iyzico can be enabled only by
 * an explicit operational override while legacy orders are being retired.
 */
export function getActivePaymentProvider(): ActivePaymentProvider | null {
  const requested = requestedPaymentProvider();
  if (requested === "IYZICO") return isIyzicoConfigured ? "IYZICO" : null;
  if (requested === "PAYTR") return isPaytrConfigured ? "PAYTR" : null;
  if (isPaytrConfigured) return "PAYTR";
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
