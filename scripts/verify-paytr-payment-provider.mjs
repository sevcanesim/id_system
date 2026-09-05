import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
let failed = false;
const check = (condition, label) => {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
  if (!condition) failed = true;
};

const config = read("lib/payments/config.ts");
const checkout = read("app/api/commerce/checkout/route.ts");
const paytr = read("lib/payments/paytr.ts");
const callback = read("app/api/payments/paytr/callback/route.ts");
const settlement = read("lib/payments/settle-commerce-payment.ts");
const csp = read("lib/security/content-security-policy.ts");
const migration = read("supabase/migrations/20260905093000_paytr_payment_provider.sql");
const reliabilityMigration = read("supabase/migrations/20260906001000_paytr_only_payment_reliability.sql");
const iframe = read("app/odeme/paytr/PaytrIframe.tsx");

check(config.includes('type ActivePaymentProvider = "PAYTR"'), "provider selection is PayTR-only");
check(config.includes('return isPaytrConfigured ? "PAYTR" : null'), "PayTR is required before checkout can start");
check(!checkout.includes("identityNumber") && !checkout.includes("IYZICO"), "checkout never collects a Turkish identity number or selects a legacy provider");
check(checkout.includes("initializePaytrCheckout") && checkout.includes("const paymentProvider = getActivePaymentProvider()") && checkout.includes("provider: paymentProvider"), "server reserves and initializes PayTR only");
check(
  paytr.includes("createHmac(\"sha256\", input.merchantKey)")
    && paytr.includes("PAYTR_TOKEN_URL")
    && paytr.includes("iframe_v2: PAYTR_IFRAME_V2"),
  "PayTR V2 token creation is server-signed",
);
check(callback.includes("verifyPaytrCallbackHash") && callback.includes('callbackOk()'), "callback verifies its signature before acknowledging");
check(callback.includes("settleCommercePaymentByPaytrCallback") && settlement.includes('.eq("provider", "PAYTR")'), "PayTR completion uses the provider-safe settlement path");
check(callback.includes("recordPaytrCallbackReceived") && callback.includes('status: "RETRYING"') && reliabilityMigration.includes("payment_callback_receipts"), "callback receipt and provider retry contract are durable");
check(reliabilityMigration.includes("enforce_paytr_commerce_payment_provider") && reliabilityMigration.includes("BUSINESS_SUBSCRIPTION_NOT_ACTIVE"), "new attempts and capacity fulfilment enforce PayTR and ACTIVE subscription invariants");
check(csp.includes("https://www.paytr.com"), "CSP explicitly permits the PayTR hosted iframe");
check(iframe.includes("iframeResizer.min.js?v2") && iframe.includes("iFrameResize"), "checkout uses PayTR V2's official responsive iframe resizer");
check(migration.includes("when 'PAYTR' then 'PayTR ödeme doğrulandı'") && migration.includes("for update"), "payment history remains provider-aware and atomic");

if (failed) process.exit(1);
console.log("\nPayTR payment provider verification passed.");
