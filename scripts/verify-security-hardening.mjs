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
mustNotInclude(middleware, '"auth-session-cookie",', "Session cookie writes must not fail closed or login cannot persist.");
mustInclude(middleware, 'scope: "auth-session-cookie"', "Session cookie route must stay rate-limited.");
mustInclude(middleware, 'status = result.unavailable ? 503 : 429', "Limiter outage must return 503, not a silent in-memory pass.");
mustInclude(middleware, "PAYLOAD_TOO_LARGE", "API JSON bodies must be capped in middleware.");
mustInclude(middleware, "100 * 1024", "JSON body cap must stay around 100kb.");
mustInclude(middleware, "/api/organizations/links/upload", "PDF upload must remain excluded from the JSON cap.");
mustInclude(middleware, 'NextResponse.redirect(url, 308)', "/nfc-siparis must 308 to /checkout.");
mustInclude(middleware, '"/nfc-siparis"', "Middleware matcher must include /nfc-siparis.");
mustInclude(middleware, 'scope: "auth-login"', "Password login must be rate-limited on /api/auth/login.");
mustNotInclude(middleware, '"auth-login",', "Password login must not 503 the account when Redis is unreachable from Edge.");
mustInclude(middleware, "x-nonce", "Middleware must pass a CSP nonce to Next.js.");
mustInclude(middleware, "createRequestNonce", "CSP nonce must be generated per request.");
mustInclude(middleware, "buildContentSecurityPolicy", "Document CSP must be issued in middleware, not as a static next.config header.");

mustNotInclude(nextConfig, "'unsafe-eval'", "CSP must not allow unsafe-eval.");
mustNotInclude(nextConfig, "Content-Security-Policy", "A static next.config CSP would AND with the nonce policy and re-open unsafe-inline.");
mustNotInclude(nextConfig, "'unsafe-inline'", "script-src unsafe-inline must not return via next.config.");

const csp = read("lib/security/content-security-policy.ts");
mustInclude(csp, "'nonce-${nonce}'", "CSP must mint a per-request script nonce.");
mustInclude(csp, "'strict-dynamic'", "Nonce CSP must allow Next.js to load its own chunks.");
mustNotInclude(csp, "script-src 'self' 'unsafe-inline'", "script-src must not allow arbitrary inline scripts.");

const loginApi = read("app/api/auth/login/route.ts");
const loginPage = read("app/giris/page.tsx");
const testGate = read("lib/auth/production-test-gate.ts");
const sessionRoute = read("app/api/auth/session/route.ts");
mustInclude(loginApi, "signInWithPassword", "Password verification must happen on the Next.js login route.");
mustInclude(loginApi, "productionTestLoginBlocked", "Login must refuse production TEST / @yenomi.test identities.");
mustInclude(loginApi, "applySessionCookies", "Login must write HttpOnly cookies on the server.");
mustInclude(loginApi, "logAuthLoginEvent", "Failed login attempts must be visible in logs.");
mustInclude(loginApi, "auth-login-email", "Login must also limit by email, not only by IP.");
mustInclude(loginApi, "limitAuthLoginIp", "Login must also limit by IP to slow credential stuffing.");
mustInclude(read("lib/security/route-rate-limits.ts"), "auth-login-ip", "Login IP limiter stays fail-open via the shared helper.");
const activationResend = read("app/api/commerce/activation/resend/route.ts");
mustInclude(activationResend, "limitActivationResendIp", "Activation resend must cap requests per IP.");
mustInclude(activationResend, "limitActivationResendOrder", "Activation resend must cool down per order.");
mustInclude(read("lib/security/route-rate-limits.ts"), "checkout-api:", "Checkout initialize limiter uses a dedicated IP key.");
mustInclude(read("vercel.json"), '"/api/cron/commerce-ops"', "Commerce ops cron must be declared in vercel.json.");
mustInclude(read("app/api/cron/commerce-ops/route.ts"), "authorizeCommerceCron", "Cron route must require CRON_SECRET in production.");
mustInclude(read("lib/email/resend.ts"), "sendAbandonedCheckoutEmail", "Abandoned checkout recovery mail must exist.");
mustInclude(read("supabase/migrations/20260822180000_commerce_ops_observability.sql"), "ABANDONED_CHECKOUT", "Email event vocabulary must include abandoned checkout.");
mustNotInclude(loginApi, "failClosed: true", "Password login must degrade to memory when Redis is down, not 503.");
mustInclude(loginPage, "passwordLogin", "The login page must send passwords through /api/auth/login.");
mustNotInclude(loginPage, "signInWithPassword", "Browser GoTrue sign-in would bypass the Next.js limiter.");
mustInclude(activation, "passwordLogin", "Activation sign-in must use the rate-limited login route.");
mustNotInclude(activation, "signInWithPassword", "Activation must not call GoTrue from the browser.");
mustInclude(testGate, 'VERCEL_ENV === "production"', "Demo accounts must be blocked on Vercel production.");
mustInclude(testGate, "ALLOW_TEST_LOGINS", "Isolated staging must be able to keep fixture logins.");
mustInclude(sessionRoute, "productionTestLoginBlocked", "Session cookie restore must not hand tokens to production demo accounts.");

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
mustInclude(playwrightConfig, 'name: "webkit"', "Safari/WebKit must be a Playwright project, not Chromium-only.");
mustInclude(playwrightConfig, "Desktop Safari", "Desktop WebKit device must stay declared.");
mustInclude(playwrightConfig, "iPhone 13", "Mobile WebKit device must stay declared.");
mustInclude(e2e, "E2E-01", "Critical journeys must name E2E-01.");
mustInclude(e2e, "E2E_BASE_URL is unset; journeys are not run.", "Missing E2E env must skip, not pass.");
mustInclude(e2e, "E2E-06", "Guest spare-card gate must be listed.");
mustInclude(e2e, "COVERAGE: 1/7 automated", "Critical journeys file must not hide that most cases are skeleton skips.");
mustInclude(e2e, "test.skip(true", "Unwired payment journeys must stay explicit skips, not empty passes.");

mustInclude(sweeper, "expire_stale_awaiting_payment_orders", "Sweeper RPC must exist.");
mustInclude(sweeper, "interval '7 days'", "Sweeper must target 7-day stale AWAITING_PAYMENT rows.");
mustInclude(sweeper, "interval '2 hours'", "Sweeper must spare in-flight PENDING attempts.");
mustInclude(sweeper, "grant execute on function public.expire_stale_awaiting_payment_orders(integer) to service_role", "Sweeper must be service-role only.");
mustInclude(reconciliation, "expire_stale_awaiting", "Admin reconciliation POST must expose the sweeper action.");
mustInclude(reconciliation, "COMMERCE_EXPIRE_STALE_AWAITING", "Sweeper runs must write an admin audit row.");

const grantDefaults = read("supabase/migrations/20260819160000_grant_data_api_roles.sql");
const grantHardening = read("supabase/migrations/20260822120000_revoke_default_data_api_privileges.sql");
mustInclude(grantDefaults, "alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated", "Historical Data API grant migration must remain as applied history.");
mustInclude(grantHardening, "revoke select, insert, update, delete on tables from anon, authenticated", "Future public tables must not auto-grant to anon/authenticated.");
mustInclude(grantHardening, "revoke execute on routines from anon, authenticated", "Future public routines must not auto-execute for Data API roles.");
mustInclude(grantHardening, "revoke all on table public.commerce_payment_attempts from anon, authenticated, public", "Payment attempt rows hold provider tokens; Data API must not DML them.");
mustInclude(grantHardening, "revoke all on table public.activation_tokens from anon, authenticated, public", "Activation secrets must stay service-role.");
const checkoutRoute = read("app/api/commerce/checkout/route.ts");
mustInclude(checkoutRoute, "rejectCheckoutInitializeFlood", "Checkout must throttle iyzico initialize calls per IP.");
mustNotInclude(checkoutRoute, "reference: payload.reference, error: orderError", "Checkout must not log raw Supabase error objects.");
mustNotInclude(checkoutRoute, "reference: payload.reference, error: reserveError", "Checkout must not log raw payment-attempt error objects.");

if (!nfcOrder.includes("export default function")) {
  throw new Error("Legacy /nfc-siparis page file must remain until Faz 2 retirement evidence exists.");
}

console.log("Security hardening contract: PASS");
