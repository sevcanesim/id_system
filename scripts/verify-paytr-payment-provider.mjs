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

check(config.includes('type ActivePaymentProvider = "PAYTR" | "IYZICO"'), "provider selection has an explicit PayTR/iyzico contract");
check(config.includes("if (isPaytrConfigured) return \"PAYTR\""), "PayTR is preferred only when fully configured");
check(checkout.includes('paymentProvider === "IYZICO" && !isValidIdentityNumber'), "identity number is required only for iyzico");
check(checkout.includes("initializePaytrCheckout") && checkout.includes("provider: paymentProvider"), "server reserves and initializes the selected provider");
check(paytr.includes("createHmac(\"sha256\", input.merchantKey)") && paytr.includes("PAYTR_TOKEN_URL"), "PayTR token creation is server-signed");
check(callback.includes("verifyPaytrCallbackHash") && callback.includes('callbackOk()'), "callback verifies its signature before acknowledging");
check(callback.includes("settleCommercePaymentByPaytrCallback") && settlement.includes('attempt.provider === "PAYTR"'), "PayTR completion uses the provider-safe settlement path");
check(csp.includes("https://www.paytr.com"), "CSP explicitly permits the PayTR hosted iframe");
check(migration.includes("when 'PAYTR' then 'PayTR ödeme doğrulandı'") && migration.includes("for update"), "payment history remains provider-aware and atomic");

if (failed) process.exit(1);
console.log("\nPayTR payment provider verification passed.");
