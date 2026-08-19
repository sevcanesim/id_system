export const iyzicoConfig = {
  apiKey: process.env.IYZICO_API_KEY ?? "",
  secretKey: process.env.IYZICO_SECRET_KEY ?? "",
  baseUrl: process.env.IYZICO_BASE_URL ?? "https://sandbox-api.iyzipay.com",
};

export const isIyzicoConfigured = Boolean(
  iyzicoConfig.apiKey && iyzicoConfig.secretKey && iyzicoConfig.baseUrl,
);

export const publicSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
