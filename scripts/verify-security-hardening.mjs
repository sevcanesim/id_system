import { existsSync, readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function mustInclude(haystack, needle, message) {
  if (!haystack.includes(needle)) throw new Error(message);
}

function mustNotInclude(haystack, needle, message) {
  if (haystack.includes(needle)) throw new Error(message);
}

const paytrCallback = read("app/api/payments/paytr/callback/route.ts");
const callbackReceipts = read("lib/payments/payment-callback-receipts.ts");
const middleware = read("proxy.ts");
const rateLimit = read("lib/security/rate-limit.ts");
const nextConfig = read("next.config.ts");
const activation = read("app/aktivasyon/ActivationClient.tsx");
const analytics = read("lib/analytics.ts");
const vitestConfig = read("vitest.config.ts");
const playwrightConfig = read("playwright.config.ts");
const publicCriticalE2e = read("tests/e2e/public-critical.spec.ts");
const responsiveE2e = read("tests/e2e/responsive-master.spec.ts");
const sweeper = read("supabase/migrations/20260821120000_expire_stale_awaiting_payment.sql");
const reconciliation = read("app/api/admin/commerce/reconciliation/route.ts");
const nfcOrder = read("app/nfc-siparis/page.tsx");
const organizationAssetMigration = read("supabase/migrations/20260903110000_private_organization_assets.sql");
const organizationLinkOpen = read("app/api/organization-links/[id]/open/route.ts");
const organizationLinkManager = read("app/api/organizations/links/route.ts");
const organizationLinkUpload = read("app/api/organizations/links/upload/route.ts");

mustInclude(paytrCallback, "verifyPaytrCallbackHash", "PayTR callback must verify its signature before settlement.");
mustInclude(paytrCallback, "recordPaytrCallbackReceived", "PayTR callbacks must leave a durable receipt.");
mustInclude(paytrCallback, "CALLBACK_RETRY", "PayTR callback failures must be retried by the provider.");
mustInclude(callbackReceipts, "providerReferenceHash", "Callback receipts must not retain raw provider references.");

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
mustInclude(middleware, '"auth-login",', "Password login API must fail closed when the Edge limiter is unavailable.");
mustInclude(middleware, "x-nonce", "Middleware must pass a CSP nonce to Next.js.");
mustInclude(middleware, "createRequestNonce", "CSP nonce must be generated per request.");
mustInclude(middleware, "buildContentSecurityPolicy", "Document CSP must be issued in middleware, not as a static next.config header.");
mustInclude(middleware, 'private, no-store, max-age=0, must-revalidate', "Nonce CSP documents must not be CDN-cached against a different request nonce.");
mustInclude(read("app/layout.tsx"), 'from "next/headers"', "Root layout must read request headers so Next can stamp the CSP nonce.");
mustInclude(read("app/layout.tsx"), "x-nonce", "Root layout must consume the middleware nonce header.");

mustNotInclude(nextConfig, "'unsafe-eval'", "CSP must not allow unsafe-eval.");
mustNotInclude(nextConfig, "Content-Security-Policy", "A static next.config CSP would AND with the nonce policy and re-open unsafe-inline.");
mustNotInclude(nextConfig, "'unsafe-inline'", "script-src unsafe-inline must not return via next.config.");

const csp = read("lib/security/content-security-policy.ts");
mustInclude(csp, "'nonce-${nonce}'", "CSP must mint a per-request script nonce.");
mustInclude(csp, "'strict-dynamic'", "Nonce CSP must allow Next.js to load its own chunks.");
mustNotInclude(csp, "script-src 'self' 'unsafe-inline'", "script-src must not allow arbitrary inline scripts.");

const loginApi = read("app/api/auth/login/route.ts");
const loginPage = read("app/giris/page.tsx") + read("app/giris/LoginClient.tsx");
const testGate = read("lib/auth/production-test-gate.ts");
const sessionRoute = read("app/api/auth/session/route.ts");
const routeRateLimits = read("lib/security/route-rate-limits.ts");
mustInclude(loginApi, "signInWithPassword", "Password verification must happen on the Next.js login route.");
mustInclude(loginApi, "productionTestLoginBlocked", "Login must refuse production TEST / @yenomi.test identities.");
mustInclude(loginApi, "applySessionCookies", "Login must write HttpOnly cookies on the server.");
mustInclude(loginApi, "logAuthLoginEvent", "Failed login attempts must be visible in logs.");
mustInclude(loginApi, "auth-login-email", "Login must also limit by email, not only by IP.");
mustInclude(loginApi, "limitAuthLoginIp", "Login must also limit by IP to slow credential stuffing.");
mustInclude(routeRateLimits, "auth-login-ip", "Login IP limiter must use a dedicated distributed key.");
mustInclude(routeRateLimits, "failClosed: true", "Login IP limiter must fail closed when the distributed limiter is unavailable.");
const activationResend = read("app/api/commerce/activation/resend/route.ts");
mustInclude(activationResend, "limitActivationResendIp", "Activation resend must cap requests per IP.");
mustInclude(activationResend, "limitActivationResendOrder", "Activation resend must cool down per order.");
mustInclude(routeRateLimits, "checkout-api:", "Checkout initialize limiter uses a dedicated IP key.");
if (existsSync("vercel.json")) {
  mustInclude(read("vercel.json"), '"/api/cron/commerce-ops"', "Commerce ops cron must be declared in vercel.json when the file exists.");
}
mustInclude(read("app/api/cron/commerce-ops/route.ts"), "authorizeCommerceCron", "Cron route must require CRON_SECRET in production.");
mustInclude(read("lib/email/resend.ts"), "sendAbandonedCheckoutEmail", "Abandoned checkout recovery mail must exist.");
mustInclude(read("supabase/migrations/20260822180000_commerce_ops_observability.sql"), "ABANDONED_CHECKOUT", "Email event vocabulary must include abandoned checkout.");
mustNotInclude(loginApi, "failClosed: true", "Login route must delegate IP fail-closed behavior to the shared limiter helper.");
mustInclude(loginPage, "passwordLogin", "The login page must send passwords through /api/auth/login.");
mustInclude(read("app/giris/page.tsx"), "searchParams", "Login HTML must be rendered from the request query so portal tabs work before hydration.");
mustInclude(read("app/giris/page.tsx"), "x-login-portal", "Login portal must also be read from the middleware request header, not only searchParams.");
mustInclude(middleware, "x-login-portal", "Middleware must copy the login portal query onto the request headers.");
mustInclude(loginApi, "application/x-www-form-urlencoded", "Password login must accept a native form POST when JavaScript is blocked.");
mustInclude(loginApi, "formData", "Form login must read urlencoded fields, not only JSON.");
mustNotInclude(loginPage, "signInWithPassword", "Browser GoTrue sign-in would bypass the Next.js limiter.");
mustInclude(activation, "passwordLogin", "Activation sign-in must use the rate-limited login route.");
mustNotInclude(activation, "signInWithPassword", "Activation must not call GoTrue from the browser.");
mustInclude(testGate, 'VERCEL_ENV === "production"', "Demo accounts must be blocked on Vercel production.");
mustInclude(testGate, "ALLOW_TEST_LOGINS", "Isolated staging must be able to keep fixture logins.");
mustInclude(sessionRoute, "productionTestLoginBlocked", "Session cookie restore must not hand tokens to production demo accounts.");

mustInclude(activation, "pagehide", "Activation token must clear from sessionStorage on pagehide.");
mustInclude(activation, "event.persisted", "Activation pagehide must keep the token for bfcache restore.");
mustNotInclude(activation, "visibilitychange", "Do not clear the activation token on visibilitychange.");

const adminOrders = read("app/api/admin/commerce/orders/route.ts");
const adminCardLink = read("app/api/admin/commerce/card-units/link/route.ts");
const adminOrganizations = read("app/api/admin/organizations/route.ts");
const adminAccess = read("app/api/admin/access/route.ts");
const adminPricing = read("app/api/admin/pricing/route.ts");
const adminOperations = read("app/api/admin/operations/route.ts");
for (const [name, source] of [
  ["commerce orders", adminOrders],
  ["payment reconciliation", reconciliation],
  ["card provenance", adminCardLink],
  ["organizations", adminOrganizations],
  ["admin access", adminAccess],
  ["pricing", adminPricing],
  ["operations", adminOperations],
]) {
  mustInclude(source, "requireSuperAdmin", `${name} admin API must require an AAL2 Super Admin session.`);
}

mustInclude(analytics, "This is not GA4", "Funnel tracker must stay an honest stub.");
mustNotInclude(analytics, "gtag(", "Do not invent a GA4 wiring.");

mustInclude(organizationAssetMigration, "set public = false", "Corporate PDF bucket must be private at rest.");
mustInclude(organizationAssetMigration, 'drop policy if exists "Organization assets are public"', "Public storage read policy must be removed.");
for (const [name, source] of [
  ["public organization-link redirect", organizationLinkOpen],
  ["organization-link manager API", organizationLinkManager],
  ["organization-link upload API", organizationLinkUpload],
]) {
  mustInclude(source, "createOrganizationAssetSignedUrl", `${name} must issue signed asset URLs.`);
  mustNotInclude(source, "getPublicUrl", `${name} must not expose a permanent public asset URL.`);
}
mustInclude(organizationLinkOpen, "z.string().uuid().safeParse", "Public organization-link tracking must validate profile IDs.");
mustInclude(organizationLinkOpen, '.eq("organization_id", link.organization_id)', "Public organization-link tracking must keep profile analytics within the link organization.");
mustInclude(organizationLinkOpen, "isOrganizationAssetPubliclyAvailable", "Public organization-link redirects must deny unpublished or future-dated assets.");
mustInclude(organizationLinkManager, "mayPreviewScheduledAssets", "Only template managers may preview scheduled organization assets.");
mustInclude(organizationLinkManager, "isOrganizationAssetPubliclyAvailable", "Non-managers must receive asset URLs only after publication.");

mustInclude(vitestConfig, '"**/*.test.ts"', "Vitest must not pick up Playwright spec files.");
mustInclude(playwrightConfig, 'testDir: "./tests/e2e"', "Playwright must own the tests/e2e directory.");
mustInclude(playwrightConfig, 'name: "chromium-mobile"', "Mobile browser coverage must remain declared.");
mustInclude(playwrightConfig, 'name: "chromium-desktop"', "Desktop browser coverage must remain declared.");
mustInclude(publicCriticalE2e, "mobile public navigation opens and closes", "Critical public navigation journey must remain covered.");
mustInclude(responsiveE2e, "mobile navigation preserves focus and escape behavior", "Responsive navigation accessibility journey must remain covered.");

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
mustInclude(checkoutRoute, "rejectCheckoutInitializeFlood", "Checkout must throttle PayTR initialization calls per IP.");
mustNotInclude(checkoutRoute, "reference: payload.reference, error: orderError", "Checkout must not log raw Supabase error objects.");
mustNotInclude(checkoutRoute, "reference: payload.reference, error: reserveError", "Checkout must not log raw payment-attempt error objects.");

if (!nfcOrder.includes("export default function")) {
  throw new Error("Legacy /nfc-siparis page file must remain until Faz 2 retirement evidence exists.");
}

console.log("Security hardening contract: PASS");
