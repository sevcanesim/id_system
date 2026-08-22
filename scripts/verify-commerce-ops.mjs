import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

let failed = false;
function check(ok, message) {
  if (ok) console.log(`PASS  ${message}`);
  else {
    console.error(`FAIL  ${message}`);
    failed = true;
  }
}

const login = read("app/api/auth/login/route.ts");
const resend = read("app/api/commerce/activation/resend/route.ts");
const checkout = read("app/api/commerce/checkout/route.ts");
const cron = read("app/api/cron/commerce-ops/route.ts");
const jobs = read("lib/commerce/commerce-ops-jobs.ts");
const email = read("lib/email/resend.ts");
const sql = read("supabase/migrations/20260822180000_commerce_ops_observability.sql");
const vercel = fs.existsSync("vercel.json") ? read("vercel.json") : "";
const freeze = read("architecture/STRUCTURAL_FREEZE_V25.8.61_RC3.json");
const page = read("app/checkout/page.tsx");
const packager = read("scripts/create-release-package.mjs");
const hygiene = read("scripts/verify-no-secrets.mjs");

check(login.includes("limitAuthLoginIp") && login.includes("auth-login-email"), "login limits IP and email in parallel");
check(resend.includes("limitActivationResendIp") && resend.includes("limitActivationResendOrder"), "activation resend has IP and order cooldown");
check(checkout.includes("rejectCheckoutInitializeFlood") && checkout.includes("initializeCheckout"), "checkout throttles before iyzico initialize");
check(email.includes("sendAbandonedCheckoutEmail") && sql.includes("ABANDONED_CHECKOUT_24H"), "abandoned checkout mail and event types exist");
check(jobs.includes("sendAbandonedCheckoutReminders") && jobs.includes("notifyOpenFulfillmentIssues"), "ops job sends recovery mail and fulfillment alerts");
check(cron.includes("authorizeCommerceCron") && (!vercel || vercel.includes("/api/cron/commerce-ops")), "protected cron route stays authorized");
check(freeze.includes("app/api/cron/commerce-ops/route.ts"), "structural freeze lists the cron route");
check(page.includes("bootstrapAuthenticatedCheckout") && page.includes("setForm"), "checkout prefill lives in a helper, not a grown page");
check(packager.includes("isSecretEnvFile") && hygiene.includes("assigned Vercel OIDC token"), "release zip and secret scan keep .env* out");
check(sql.includes("FULFILLMENT_ISSUE_ESCALATION"), "fulfillment escalation event type is declared");

if (failed) process.exit(1);
console.log("\nCommerce ops hardening verification passed.");
