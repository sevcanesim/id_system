import { existsSync, readFileSync, readdirSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

function mustInclude(haystack, needle, message) {
  if (!haystack.includes(needle)) throw new Error(message);
}

function mustNotInclude(haystack, needle, message) {
  if (haystack.includes(needle)) throw new Error(message);
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(target);
    return entry.isFile() ? [target] : [];
  });
}

const paytrCallback = read("app/api/payments/paytr/callback/route.ts");
const paytr = read("lib/payments/paytr.ts");
const providerPayload = read("lib/payments/sanitize-provider-payload.ts");
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
const profileImageMigration = read("supabase/migrations/20260906150000_private_profile_images.sql");
const profileImageUpload = read("app/api/profile-images/route.ts");
const ownProfileImage = read("app/api/profile-images/own/route.ts");
const publicProfileImage = read("app/api/public/profile-images/[publicId]/route.ts");
const legacyPublicProfilePage = read("app/[slug]/page.tsx");
const legacyVcard = read("app/[slug]/vcard/route.ts");
const organizationIntegrations = read("app/api/organizations/integrations/route.ts");
const webhookDelivery = read("lib/organizations/webhook-integrations.ts");
const networkingLeadApi = read("app/api/networking/leads/route.ts");
const networkingManageApi = read("app/api/organizations/networking/route.ts");
const requestIdentity = read("lib/auth/request-identity.ts");
const loginAudit = read("lib/auth/login-audit.ts");
const observabilityRetention = read("supabase/migrations/20260906180000_operational_observability_retention.sql");
const loginAuditMigration = read("supabase/migrations/20260906190000_auth_login_event_telemetry.sql");
const privacyRequestMigration = read("supabase/migrations/20260906200000_privacy_request_workflow.sql");
const analyticsMinimizationMigration = read("supabase/migrations/20260906210000_card_view_analytics_minimization.sql");
const privacyRequestsApi = read("app/api/privacy/requests/route.ts");
const adminPrivacyRequestsApi = read("app/api/admin/privacy-requests/route.ts");
const cardViews = read("lib/analytics/card-views.ts");
const cardWizard = read("app/olustur/CardWizard.tsx");
const checkoutPage = read("app/checkout/page.tsx");
const reverseGeocode = read("app/api/location/reverse/route.ts");
const coordinates = read("lib/location/coordinates.ts");
const checkoutResumeDraft = read("lib/commerce/checkout-resume-draft.ts");
const clientPrivateState = read("lib/security/client-private-state.ts");
const dashboardShell = read("app/ui/DashboardShell.tsx");
const runtimeSources = [
  ...sourceFiles("app/api"),
  ...sourceFiles("lib"),
  "app/olustur/CardWizard.tsx",
].filter((file) => !file.includes(".test."));
const rawConsoleSources = runtimeSources.filter((file) => /console\.[a-zA-Z]+\s*\(/.test(read(file)));

if (rawConsoleSources.length) {
  throw new Error(`Runtime kaynaklarda ham console kullanımı yasaktır: ${rawConsoleSources.join(", ")}`);
}

mustInclude(paytrCallback, "verifyPaytrCallbackHash", "PayTR callback must verify its signature before settlement.");
mustInclude(paytrCallback, "recordPaytrCallbackReceived", "PayTR callbacks must leave a durable receipt.");
mustInclude(paytrCallback, "CALLBACK_RETRY", "PayTR callback failures must be retried by the provider.");
mustInclude(callbackReceipts, "providerReferenceHash", "Callback receipts must not retain raw provider references.");
mustNotInclude(paytr, "asSafeCallbackMessage", "PayTR provider rejection text must not be retained from an external response.");
mustNotInclude(providerPayload, "merchantOid:", "Provider payload snapshots must not retain raw merchant references.");
mustNotInclude(providerPayload, "paymentId:", "Provider payload snapshots must not retain raw provider payment references.");
mustNotInclude(providerPayload, "errorMessage:", "Provider payload snapshots must not retain raw provider error messages.");

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
mustInclude(nextConfig, "productionBrowserSourceMaps: false", "Production browser source maps must stay disabled.");
mustInclude(nextConfig, "poweredByHeader: false", "Framework identification headers must stay disabled.");
mustInclude(nextConfig, "removeConsole: true", "Production client bundles must not retain console output.");

const csp = read("lib/security/content-security-policy.ts");
mustInclude(csp, "'nonce-${nonce}'", "CSP must mint a per-request script nonce.");
mustInclude(csp, "'strict-dynamic'", "Nonce CSP must allow Next.js to load its own chunks.");
mustNotInclude(csp, "script-src 'self' 'unsafe-inline'", "script-src must not allow arbitrary inline scripts.");
mustNotInclude(csp, "*.supabase.co", "CSP must only allow the configured Supabase origin.");

const loginApi = read("app/api/auth/login/route.ts");
const loginPage = read("app/giris/page.tsx") + read("app/giris/LoginClient.tsx");
const testGate = read("lib/auth/production-test-gate.ts");
const sessionRoute = read("app/api/auth/session/route.ts");
const routeRateLimits = read("lib/security/route-rate-limits.ts");
mustInclude(loginApi, "signInWithPassword", "Password verification must happen on the Next.js login route.");
mustInclude(loginApi, "productionTestLoginBlocked", "Login must refuse production TEST / @yenomi.test identities.");
mustInclude(loginApi, "applySessionCookies", "Login must write HttpOnly cookies on the server.");
mustInclude(loginApi, "logAuthLoginEvent", "Failed login attempts must be visible in logs.");
mustInclude(loginAudit, "ip_fingerprint", "Login telemetry must pseudonymize the client IP.");
mustInclude(loginAudit, "user_fingerprint", "Login telemetry must pseudonymize the account identifier.");
mustNotInclude(loginAudit, "ip: event.ip", "Login telemetry must not emit raw IP addresses.");
mustNotInclude(loginAudit, "console.info", "Login telemetry must not emit diagnostic data to process logs.");
mustInclude(loginAuditMigration, "create table if not exists public.auth_login_events", "Login telemetry must have a durable service-role-only destination.");
mustInclude(loginAuditMigration, "p_retention_days integer default 90", "Login telemetry must have a 90-day default retention policy.");
mustInclude(observabilityRetention, "p_error_retention_days integer default 90", "System error logs must have a 90-day default retention policy.");
mustInclude(privacyRequestMigration, "create table if not exists public.privacy_requests", "Privacy access and erasure requests need durable storage.");
mustInclude(privacyRequestMigration, "privacy_requests_one_open_request_per_type", "Duplicate open privacy requests must be blocked per user and type.");
mustInclude(privacyRequestMigration, "create table if not exists public.privacy_request_events", "Privacy request state changes need a durable evidence trail.");
mustInclude(privacyRequestMigration, "admin_transition_privacy_request", "Privacy requests must transition in a server-side state machine.");
mustInclude(privacyRequestMigration, "RESOLUTION_CODE_REQUIRED", "Completed privacy requests must retain a classified resolution code.");
mustInclude(privacyRequestMigration, "revoke all on table public.privacy_requests from public, anon, authenticated", "Privacy requests must remain service-role only.");
mustInclude(privacyRequestsApi, "resolveRequestIdentity", "Privacy request API must derive the subject from the authenticated request.");
mustInclude(privacyRequestsApi, "submit_privacy_request", "Privacy request API must use the durable submission RPC.");
mustInclude(adminPrivacyRequestsApi, "requireSuperAdmin", "Privacy request administration must require AAL2 Super Admin access.");
mustInclude(adminPrivacyRequestsApi, "admin_transition_privacy_request", "Privacy request administration must use the state-machine RPC.");
mustInclude(cardViews, "ANALYTICS_FINGERPRINT_SECRET", "Card analytics must use a dedicated HMAC key.");
mustNotInclude(cardViews, "SUPABASE_SERVICE_ROLE_KEY", "Card analytics must not reuse the service-role key as a fingerprint secret.");
mustInclude(cardViews, 'headerList.get("dnt")', "Card analytics must honor Do Not Track.");
mustInclude(cardViews, 'headerList.get("sec-gpc")', "Card analytics must honor Global Privacy Control.");
mustNotInclude(cardViews, 'headerList.get("referer")', "Card analytics must not persist raw referrers.");
mustNotInclude(cardViews, 'headerList.get("x-vercel-ip-city")', "Card analytics must not persist city-level location.");
mustInclude(analyticsMinimizationMigration, "purge_card_view_events", "Card analytics needs a bounded retention function.");
mustNotInclude(cardWizard, "readPersonalCardDraft", "Card editor must not restore personal data from browser storage.");
mustNotInclude(cardWizard, "writePersonalCardDraft", "Card editor must not persist personal data in browser storage.");
mustNotInclude(cardWizard, 'localStorage.getItem("yenomi-card-draft")', "Card editor must not read a cross-account draft key.");
mustNotInclude(cardWizard, 'localStorage.setItem("yenomi-card-draft")', "Card editor must not write a cross-account draft key.");
mustNotInclude(cardWizard, "/api/location/ip", "Card editor must not silently infer a location from the visitor IP.");
mustInclude(cardWizard, "minimizeCoordinates", "Card editor reverse geocoding must reduce coordinate precision.");
mustInclude(checkoutPage, "minimizeCoordinates", "Checkout reverse geocoding must reduce coordinate precision.");
mustInclude(reverseGeocode, "minimizeCoordinates", "Reverse geocoding must reject or minimize untrusted coordinates server-side.");
mustNotInclude(reverseGeocode, "mapUrl", "Reverse geocoding must not return a persistent exact-coordinate map URL.");
mustInclude(reverseGeocode, '"Referrer-Policy": "no-referrer"', "Reverse geocoding responses must not spread coordinate URLs through referrers.");
mustInclude(coordinates, "LOCATION_DECIMAL_PLACES = 4", "Location precision must remain limited to roughly an address block.");
mustInclude(checkoutResumeDraft, "minimizeCoordinates", "Checkout resume state must not restore more precise coordinates.");
if (existsSync("app/api/location/ip/route.ts") || existsSync("lib/location/request-ip.ts")) {
  throw new Error("Silent IP-location fallback sources must remain removed.");
}
mustInclude(clientPrivateState, "CARD_DRAFT_PREFIX", "Private browser state must clear account-scoped drafts left by older releases.");
mustNotInclude(clientPrivateState, "localStorage.setItem", "Private browser state must not write sensitive drafts.");
mustInclude(clientPrivateState, "clearSensitiveBrowserState", "Sensitive browser state needs an explicit logout cleanup path.");
mustInclude(dashboardShell, "clearSensitiveBrowserState", "Logout must clear sensitive browser state.");
mustInclude(requestIdentity, "hasTrustedSameOrigin", "Cookie-authenticated writes must verify same-origin intent.");
mustInclude(requestIdentity, "hasBearerCredential", "Bearer API clients must remain explicit when bypassing the cookie CSRF gate.");
mustInclude(networkingLeadApi, "NETWORKING_IP_FINGERPRINT_SECRET", "Networking IP fingerprints must use a dedicated HMAC secret.");
mustNotInclude(networkingLeadApi, "createHash(\"sha256\").update(clientIp)", "Networking IPs must not use unsalted hashes.");
mustInclude(networkingLeadApi, "failClosed: true", "Public networking lead submission must fail closed if distributed rate limiting is unavailable.");
mustNotInclude(networkingLeadApi, "fullName: submission.fullName", "Lead PII must not be copied into external webhook payloads.");
mustNotInclude(networkingManageApi, "fullName: leadRow.full_name", "Lead updates must not copy PII into external webhook payloads.");
mustInclude(webhookDelivery, "WEBHOOK_DATA_FIELDS", "Webhook payloads must be allowlisted by event type.");
mustNotInclude(webhookDelivery, "data: payload", "Webhook queues must not accept arbitrary payload fields.");
mustInclude(observabilityRetention, "status <> 'RUNNING'", "Retention must not delete in-flight operational job records.");
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

mustInclude(activation, "window.location.hash", "Activation token must be read from the URL fragment, not query parameters.");
mustInclude(activation, "history.replaceState", "Legacy activation query tokens must be moved out of server-visible URLs.");
mustNotInclude(activation, "sessionStorage", "Activation token must not be persisted in browser storage.");
mustNotInclude(activation, "visibilitychange", "Activation flow must not couple token handling to page visibility.");

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

mustInclude(analytics, "window.dataLayer.push", "Funnel tracker must keep events local until a provider is deliberately integrated.");
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

mustInclude(profileImageMigration, "public = false", "Profile images must be private at rest.");
mustInclude(profileImageMigration, "allowed_mime_types = array['image/webp']", "Profile image storage must accept normalized WebP only.");
mustInclude(profileImageMigration, "drop policy if exists", "Direct profile-image storage policies must be removed.");
mustInclude(profileImageUpload, "normalizeProfileImage", "Profile uploads must be MIME-verified and re-encoded server-side.");
mustInclude(profileImageUpload, "isProfileImagePathOwnedBy", "Profile image deletion must verify ownership.");
mustNotInclude(profileImageUpload, "getPublicUrl", "Profile uploads must not issue permanent public URLs.");
mustInclude(ownProfileImage, "resolveRequestIdentity", "Own profile image access must require an authenticated identity.");
mustInclude(publicProfileImage, "isCardProfileServiceActive", "Public profile images must stop serving when the card service ends.");
mustInclude(publicProfileImage, "X-Content-Type-Options", "Profile image responses must prevent MIME sniffing.");
mustInclude(legacyPublicProfilePage, 'databaseProfile.card_status !== "ACTIVE"', "Legacy slugs must not redirect an inactive or lost card to its public identifier.");
mustNotInclude(legacyPublicProfilePage, "permanentRedirect", "Legacy slug redirects must not be permanently cached after a card is lost.");
mustInclude(legacyVcard, 'data.card_status === "ACTIVE"', "Legacy vCard redirects must only resolve active cards.");
mustInclude(legacyVcard, "isCardProfileServiceActive(data)", "Legacy vCard redirects must respect service expiry.");
mustInclude(legacyVcard, '"Cache-Control", "private, no-store"', "Legacy vCard redirects must not become a durable cache record.");

mustInclude(organizationIntegrations, "resolvePublicWebhookEndpoint", "Webhook endpoints must be DNS-validated before configuration is stored.");
mustInclude(webhookDelivery, "resolvePublicWebhookEndpoint", "Webhook delivery must resolve DNS immediately before egress.");
mustInclude(webhookDelivery, "lookup:", "Webhook delivery must pin the approved DNS address for the request.");
mustInclude(webhookDelivery, "WEBHOOK_HTTP_", "Webhook delivery must persist classified errors rather than raw responses.");
mustNotInclude(webhookDelivery, "fetch(endpoint", "Webhook delivery must not use an unpinned fetch request.");

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
