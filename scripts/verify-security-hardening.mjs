import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function mustInclude(haystack, needle, message) {
  if (!haystack.includes(needle)) throw new Error(message);
}

function mustNotInclude(haystack, needle, message) {
  if (haystack.includes(needle)) throw new Error(message);
}

const recover = read("app/api/payments/iyzico/recover/route.ts");
const recoverAuth = read("lib/payments/recover-authorization.ts");
const middleware = read("middleware.ts");
const rateLimit = read("lib/security/rate-limit.ts");
const nextConfig = read("next.config.ts");
const activation = read("app/aktivasyon/ActivationClient.tsx");
const webhook = read("app/api/payments/iyzico/webhook/route.ts");
const webhookSecret = read("lib/payments/iyzico-webhook-secret.ts");
const analytics = read("lib/analytics.ts");
const vitestConfig = read("vitest.config.ts");
const playwrightConfig = read("playwright.config.ts");
const e2e = read("e2e/critical-journeys.spec.ts");
const sweeper = read("supabase/migrations/20260821120000_expire_stale_awaiting_payment.sql");
const reconciliation = read("app/api/admin/commerce/reconciliation/route.ts");
const nfcOrder = read("app/nfc-siparis/page.tsx");

mustInclude(recoverAuth, "owner-required", "Recover intent must distinguish cookie possession from a body UUID.");
mustInclude(recoverAuth, "ownerMayRecover", "Guest orders must not recover from a body UUID.");
mustInclude(recover, "resolveRecoverIntent", "Recover route must use the recover authorization helper.");
mustInclude(recover, "resolveRequestUserId", "Body-only recover must require an authenticated owner.");
mustInclude(recover, 'status: 401', "Unauthenticated body-only recover must 401.");
mustNotInclude(recover, "resolveRecoverOrderId(readPendingOrderId", "Recover must not settle cookie-or-body without an owner check.");

mustInclude(rateLimit, "failClosed", "Distributed limiter must support fail-closed mode.");
mustInclude(rateLimit, "unavailable: true", "Fail-closed limiter must surface unavailability.");
mustInclude(middleware, "FAIL_CLOSED_SCOPES", "Checkout/auth scopes must fail closed without Redis in production.");
mustInclude(middleware, 'pathname.startsWith("/api/") && FAIL_CLOSED_SCOPES.has(rule.scope)', "HTML pages must not 503 when Redis is unavailable; fail-closed is API-only.");
mustNotInclude(middleware, '"login-page",', "The login document must not fail closed or visitors see a blank 503.");
mustInclude(middleware, 'status = result.unavailable ? 503 : 429', "Limiter outage must return 503, not a silent in-memory pass.");
mustInclude(middleware, "PAYLOAD_TOO_LARGE", "API JSON bodies must be capped in middleware.");
mustInclude(middleware, "100 * 1024", "JSON body cap must stay around 100kb.");
mustInclude(middleware, "/api/organizations/links/upload", "PDF upload must remain excluded from the JSON cap.");
mustInclude(middleware, 'NextResponse.redirect(url, 308)', "/nfc-siparis must 308 to /checkout.");
mustInclude(middleware, '"/nfc-siparis"', "Middleware matcher must include /nfc-siparis.");

mustNotInclude(nextConfig, "'unsafe-eval'", "CSP must not allow unsafe-eval.");
mustInclude(nextConfig, "script-src 'self' 'unsafe-inline'", "CSP may keep unsafe-inline until a nonce migration.");

mustInclude(activation, "pagehide", "Activation token must clear from sessionStorage on pagehide.");
mustInclude(activation, "event.persisted", "Activation pagehide must keep the token for bfcache restore.");
mustNotInclude(activation, "visibilitychange", "Do not clear the activation token on visibilitychange.");

mustInclude(webhookSecret, "timingSafeEqual", "Optional webhook secret must compare in constant time.");
mustInclude(webhook, "IYZICO_WEBHOOK_SECRET", "Webhook must honor IYZICO_WEBHOOK_SECRET when set.");
mustInclude(webhook, "settleCommercePaymentByProviderToken", "Webhook authenticity remains retrieveCheckout settlement.");

mustInclude(analytics, "This is not GA4", "Funnel tracker must stay an honest stub.");
mustNotInclude(analytics, "gtag(", "Do not invent a GA4 wiring.");

mustInclude(vitestConfig, '"**/*.test.ts"', "Vitest must not pick up Playwright spec files.");
mustInclude(playwrightConfig, 'testDir: "e2e"', "Playwright must own the e2e directory.");
mustInclude(e2e, "E2E-01", "Critical journeys must name E2E-01.");
mustInclude(e2e, "E2E_BASE_URL is unset; journeys are not run.", "Missing E2E env must skip, not pass.");
mustInclude(e2e, "E2E-06", "Guest spare-card gate must be listed.");

mustInclude(sweeper, "expire_stale_awaiting_payment_orders", "Sweeper RPC must exist.");
mustInclude(sweeper, "interval '7 days'", "Sweeper must target 7-day stale AWAITING_PAYMENT rows.");
mustInclude(sweeper, "interval '2 hours'", "Sweeper must spare in-flight PENDING attempts.");
mustInclude(sweeper, "grant execute on function public.expire_stale_awaiting_payment_orders(integer) to service_role", "Sweeper must be service-role only.");
mustInclude(reconciliation, "expire_stale_awaiting", "Admin reconciliation POST must expose the sweeper action.");
mustInclude(reconciliation, "COMMERCE_EXPIRE_STALE_AWAITING", "Sweeper runs must write an admin audit row.");

if (!nfcOrder.includes("export default function")) {
  throw new Error("Legacy /nfc-siparis page file must remain until Faz 2 retirement evidence exists.");
}

console.log("Security hardening contract: PASS");
