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
const organizationWebhookCron = read("app/api/cron/organization-integrations/route.ts");
const retentionCron = read("app/api/cron/observability-retention/route.ts");
const jobLease = read("lib/operations/job-lease.ts");
const jobs = read("lib/commerce/commerce-ops-jobs.ts");
const email = read("lib/email/resend.ts");
const sql = read("supabase/migrations/20260822180000_commerce_ops_observability.sql");
const jobLeaseSql = read("supabase/migrations/20260906160000_operational_job_leases.sql");
const jobRunSql = read("supabase/migrations/20260906170000_operational_job_run_history.sql");
const observabilityRetentionSql = read("supabase/migrations/20260906180000_operational_observability_retention.sql");
const analyticsRetentionSql = read("supabase/migrations/20260906210000_card_view_analytics_minimization.sql");
const corporateLeadSql = read("supabase/migrations/20260906220000_secure_corporate_lead_operations.sql");
const corporateLeadWorker = read("lib/operations/corporate-lead-notifications.ts");
const corporateLeadRoute = read("app/api/corporate-leads/route.ts");
const vercel = fs.existsSync("vercel.json") ? read("vercel.json") : "";
const freeze = read("architecture/STRUCTURAL_FREEZE_V25.8.61_RC3.json");
const page = read("app/checkout/page.tsx");
const packager = read("scripts/create-release-package.mjs");
const hygiene = read("scripts/verify-no-secrets.mjs");

check(login.includes("limitAuthLoginIp") && login.includes("auth-login-email"), "login limits IP and email in parallel");
check(resend.includes("limitActivationResendIp") && resend.includes("limitActivationResendOrder"), "activation resend has IP and order cooldown");
check(checkout.includes("rejectCheckoutInitializeFlood") && checkout.includes("initializePaytrCheckout"), "checkout throttles before PayTR initialization");
check(email.includes("sendAbandonedCheckoutEmail") && sql.includes("ABANDONED_CHECKOUT_24H"), "abandoned checkout mail and event types exist");
check(jobs.includes("sendAbandonedCheckoutReminders") && jobs.includes("notifyOpenFulfillmentIssues"), "ops job sends recovery mail and fulfillment alerts");
check(cron.includes("authorizeCommerceCron") && (!vercel || vercel.includes("/api/cron/commerce-ops")), "protected cron route stays authorized");
check(cron.includes("runWithOperationalJobLease") && organizationWebhookCron.includes("runWithOperationalJobLease") && retentionCron.includes("runWithOperationalJobLease"), "scheduled workers acquire exclusive leases before processing");
check(jobLease.includes("start_operational_job_run") && jobLease.includes("finish_operational_job_run"), "scheduled workers persist run start and completion states");
check(jobLeaseSql.includes("acquire_operational_job_lease") && jobLeaseSql.includes("lease_expires_at"), "operational lease is atomic and expires safely");
check(jobRunSql.includes("operational_job_runs") && jobRunSql.includes("processed_count") && jobRunSql.includes("error_code"), "job history keeps safe status, count, and error-code telemetry");
check(observabilityRetentionSql.includes("purge_operational_observability") && observabilityRetentionSql.includes("system_error_logs") && observabilityRetentionSql.includes("operational_job_runs"), "operational telemetry has a bounded retention policy");
check(analyticsRetentionSql.includes("purge_card_view_events") && analyticsRetentionSql.includes("p_retention_days integer default 90"), "card-view analytics has a bounded retention policy");
check(vercel.includes("/api/cron/observability-retention"), "daily observability retention cron is scheduled");
check(freeze.includes("app/api/cron/commerce-ops/route.ts"), "structural freeze lists the cron route");
check(page.includes("bootstrapAuthenticatedCheckout") && page.includes("setForm"), "checkout prefill lives in a helper, not a grown page");
check(packager.includes("isSecretEnvFile") && hygiene.includes("assigned Vercel OIDC token"), "release zip and secret scan keep .env* out");
check(sql.includes("FULFILLMENT_ISSUE_ESCALATION"), "fulfillment escalation event type is declared");
check(corporateLeadSql.includes("encrypted_payload") && corporateLeadSql.includes("notification_status"), "corporate lead payloads and notification lifecycle are persisted");
check(corporateLeadWorker.includes("deliverCorporateLeadNotifications") && corporateLeadWorker.includes("PROCESSING"), "corporate lead notifications use a claim and retry lifecycle");
check(corporateLeadRoute.includes("encryptCorporateLeadPayload") && corporateLeadRoute.includes("createHmac"), "corporate lead intake encrypts contact content and fingerprints source IP with HMAC");

if (failed) process.exit(1);
console.log("\nCommerce ops hardening verification passed.");
