import { readFileSync } from "node:fs";

const browser = readFileSync("lib/supabase/browser.ts", "utf8");
const bridge = readFileSync("app/components/AuthSessionBridge.tsx", "utf8");
const session = readFileSync("app/api/auth/session/route.ts", "utf8");
const sessionIdentity = readFileSync("app/api/auth/session/identity/route.ts", "utf8");
const helper = readFileSync("lib/auth/http-only-session.ts", "utf8");
const middleware = readFileSync("proxy.ts", "utf8");
const login = readFileSync("app/giris/page.tsx", "utf8") + readFileSync("app/giris/LoginClient.tsx", "utf8");
const passwordLogin = readFileSync("lib/auth/password-login.ts", "utf8");
const cardWizard = readFileSync("app/olustur/CardWizard.tsx", "utf8");
const cardActions = readFileSync("app/hooks/useProfileCardActions.ts", "utf8");
const analyticsPage = readFileSync("app/istatistikler/page.tsx", "utf8");
const leadsPage = readFileSync("app/leadler/page.tsx", "utf8");
const individualInbox = readFileSync("app/api/networking/inbox/route.ts", "utf8");
const settingsPage = readFileSync("app/ayarlar/page.tsx", "utf8");
const accountRoute = readFileSync("app/api/account/route.ts", "utf8");
const logoutRoute = readFileSync("app/api/auth/logout/route.ts", "utf8");
const corporatePanel = readFileSync("app/kurumsal/panel/CorporatePanelClient.tsx", "utf8");
const corporateCards = readFileSync("app/kurumsal/panel/hooks/useCorporateCards.ts", "utf8");
const corporateLinks = readFileSync("app/kurumsal/panel/hooks/useCorporateLinks.ts", "utf8");
const corporateTitles = readFileSync("app/kurumsal/panel/hooks/useJobTitlesAndRequests.ts", "utf8");
const corporateAudit = readFileSync("app/kurumsal/panel/components/AuditPanel.tsx", "utf8");
const mfaRoute = readFileSync("app/api/auth/mfa/route.ts", "utf8");
const invitePage = readFileSync("app/kurumsal/davet/page.tsx", "utf8");
const inviteClient = readFileSync("lib/auth/organization-invite.ts", "utf8");
const inviteAcceptRoute = readFileSync("app/api/organizations/invite/accept/route.ts", "utf8");
const corporateOrganizationRoutes = [
  "app/api/organizations/physical-cards/route.ts",
  "app/api/organizations/member-card-statuses/route.ts",
  "app/api/organizations/card-analytics/route.ts",
  "app/api/organizations/job-titles/route.ts",
  "app/api/organizations/invites/route.ts",
  "app/api/organizations/links/upload/route.ts",
].map((path) => readFileSync(path, "utf8")).join("\n");
const organizationIdentity = readFileSync("app/olustur/domain/organization-identity.ts", "utf8");
const organizationRoutes = [
  "app/api/organizations/card-profile-link/route.ts",
  "app/api/organizations/links/route.ts",
  "app/api/organizations/members/route.ts",
  "app/api/organizations/templates/route.ts",
  "app/api/organizations/title-requests/route.ts",
].map((path) => readFileSync(path, "utf8")).join("\n");

function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}

function forbidText(source, token, message) {
  if (source.includes(token)) throw new Error(message);
}

requireText(browser, "memoryAuthStorage", "Browser client must persist supabase auth in memory only.");
requireText(browser, "purgeLegacyAuthStorage", "Browser client must remove leftover sb- auth tokens from Web Storage.");
requireText(browser, "storage: memoryAuthStorage()", "supabase-js persistSession must use the in-memory Map, not localStorage.");
requireText(browser, "setSession", "Browser client must restore the in-memory session from HttpOnly cookies.");
requireText(browser, 'fetch("/api/auth/session"', "Browser client must GET /api/auth/session on load.");
requireText(browser, "x-yenomi-session", "Browser restore fetch must send the session restore header.");
forbidText(browser, "window.localStorage.setItem(key, value)", "Browser client must not write supabase auth keys to localStorage.");
forbidText(browser, "window.sessionStorage.setItem(key, value)", "Browser client must not write supabase auth keys to sessionStorage.");
requireText(browser, "yenomi-remember-session", "Remember-me may still store a non-secret email preference.");

requireText(session, "export async function GET", "Session route must restore cookies via GET.");
requireText(session, "isTrustedSessionRestoreRequest", "Session GET must refuse document navigations that would dump tokens.");
requireText(session, "auth.getUser", "Access cookie must still be verified with auth.getUser before POST set.");
requireText(session, "httpOnly: true", "Session cookies must remain HttpOnly.");
requireText(sessionIdentity, "resolveRestorableSession", "Browser identity must be restored from HttpOnly cookies on the server.");
requireText(sessionIdentity, "user: { id:", "Browser identity response must contain a non-secret user identity.");
forbidText(sessionIdentity, "accessToken:", "Browser identity response must never expose an access token.");
forbidText(sessionIdentity, "refreshToken:", "Browser identity response must never expose a refresh token.");
requireText(helper, 'REFRESH_COOKIE = "yenomi-refresh-token"', "Refresh token must use a dedicated HttpOnly cookie.");
requireText(helper, "grant_type=refresh_token", "Server must rotate expired access tokens through GoTrue.");
requireText(helper, "httpOnly: true", "Shared cookie helper must set HttpOnly.");
forbidText(session, "console.error(\"auth session cookie error\", parsed", "Session route must not log token payloads.");

forbidText(bridge, "getSupabaseBrowserClient", "Global auth bridge must not restore privileged Supabase tokens on every route.");
requireText(bridge, "getRememberedLogin", "Refresh cookie lifetime must follow remember-me.");

requireText(middleware, "resolveMiddlewareSession", "Middleware must accept a rotated refresh session, not only a live access cookie.");
requireText(middleware, "applySessionCookies", "Middleware must write rotated HttpOnly cookies onto the response.");
requireText(middleware, "clearSessionCookies", "Failed protected-page auth must clear access and refresh cookies.");

requireText(login, "passwordLogin", "Password login must go through /api/auth/login so the limiter sees the attempt.");
requireText(login, 'window.location.replace(isDefaultWorkspacePath(returnPath) ? "/hesabim" : returnPath)', "Password login must continue through server-side workspace routing.");
forbidText(passwordLogin, "hydrateBrowserSessionFromCookies", "Password login must not rehydrate browser memory from HttpOnly cookies.");

requireText(cardWizard, "getBrowserIdentity", "Card editor must resolve its identity through the HttpOnly session endpoint.");
requireText(cardWizard, 'fetch("/api/profiles/mine", { credentials: "same-origin", cache: "no-store" })', "Card editor must load profiles through its cookie-authenticated API.");
forbidText(cardWizard, "getSupabaseBrowserClient", "Card editor must not hydrate a browser Supabase session.");
forbidText(cardWizard, "authorization: `Bearer", "Card editor must not send access tokens in request headers.");
forbidText(cardActions, "getSupabaseBrowserClient", "Card actions must not hydrate a browser Supabase session.");
forbidText(cardActions, "authorization: `Bearer", "Card actions must not send access tokens in request headers.");
requireText(cardActions, 'credentials: "same-origin"', "Card actions must use cookie-authenticated APIs.");
forbidText(analyticsPage, "getSupabaseBrowserClient", "Analytics must not hydrate a browser Supabase session.");
forbidText(analyticsPage, "authorization: `Bearer", "Analytics must not send access tokens in request headers.");
requireText(analyticsPage, 'credentials: "same-origin"', "Analytics must use its cookie-authenticated API.");
forbidText(leadsPage, "getBrowserSession", "Individual leads must not retrieve browser access tokens.");
forbidText(leadsPage, "authorization: `Bearer", "Individual leads must not send access tokens in request headers.");
requireText(individualInbox, "resolveRequestIdentity", "Individual networking APIs must accept the HttpOnly session cookie.");
forbidText(settingsPage, "getSupabaseBrowserClient", "Account settings must not hydrate a browser Supabase session.");
forbidText(settingsPage, "authorization: `Bearer", "Account settings must not send access tokens in request headers.");
requireText(settingsPage, 'fetch("/api/account", { credentials: "same-origin", cache: "no-store" })', "Account settings must load its identity from a cookie-authenticated API.");
requireText(accountRoute, "resolveRequestIdentity", "Account API must verify the HttpOnly session server-side.");
requireText(accountRoute, "validateSignupPassword", "Account API must enforce the shared password policy server-side.");
requireText(logoutRoute, "clearSessionCookies", "Logout must clear both HttpOnly session cookies.");
for (const [source, label] of [[corporatePanel, "Corporate panel"], [corporateCards, "Corporate cards"], [corporateLinks, "Corporate links"], [corporateTitles, "Corporate job titles"], [corporateAudit, "Corporate audit"]]) {
  forbidText(source, "authorization: `Bearer", `${label} must not send access tokens in request headers.`);
  forbidText(source, "getBrowserSession", `${label} must not retrieve browser access tokens.`);
}
forbidText(corporatePanel, "getSupabaseBrowserClient", "Corporate panel must not hydrate a browser Supabase session.");
forbidText(corporateAudit, "getSupabaseBrowserClient", "Corporate MFA must use its server-side cookie-authenticated endpoint.");
requireText(corporateOrganizationRoutes, "resolveRequestIdentity", "Organization APIs must accept the HttpOnly session cookie.");
requireText(mfaRoute, "resolveRequestIdentity", "MFA API must verify the HttpOnly session server-side.");
requireText(mfaRoute, "applySessionCookies", "Successful MFA verification must rotate the HttpOnly session cookie.");
forbidText(invitePage, "getSupabaseBrowserClient", "Invite page must not hydrate a browser Supabase session.");
forbidText(inviteClient, "authorization: `Bearer", "Invite acceptance must not send access tokens in request headers.");
requireText(inviteClient, 'credentials: "same-origin"', "Invite acceptance must use the HttpOnly session cookie.");
requireText(inviteAcceptRoute, "resolveRequestIdentity", "Invite acceptance must verify the HttpOnly session server-side.");
forbidText(organizationIdentity, "authorization: `Bearer", "Card editor organization reads must use cookie identity.");
requireText(organizationRoutes, "resolveRequestIdentity", "Card editor organization APIs must accept the HttpOnly session cookie.");

const loginApi = readFileSync("app/api/auth/login/route.ts", "utf8");
requireText(loginApi, "applySessionCookies", "Password login must set HttpOnly cookies on the server.");
requireText(loginApi, "productionTestLoginBlocked", "Password login must refuse production demo identities.");

console.log("HttpOnly supabase session contract: PASS");
