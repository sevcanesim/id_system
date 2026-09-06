import fs from "node:fs";
import path from "node:path";

function compareVersion(a,b){const pa=a.split(".").map(Number),pb=b.split(".").map(Number);for(let i=0;i<Math.max(pa.length,pb.length);i++){const d=(pa[i]||0)-(pb[i]||0);if(d)return d;}return 0;}

const root = process.cwd();
let failed = false;
const pass = (m) => console.log(`PASS  ${m}`);
const fail = (m) => { failed = true; console.error(`FAIL  ${m}`); };
const check = (condition, message) => condition ? pass(message) : fail(message);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const required = [
  "app/giris/page.tsx",
  "app/giris/LoginClient.tsx",
  "app/hesabim/page.tsx",
  "app/aktivasyon/page.tsx",
  "docs/AUTHENTICATION_ACTIVATION_PHASE6_V25.8.46.md",
  "audit/PHASE6_AUTH_ACTIVATION_AUDIT.json"
];
for (const file of required) check(exists(file), `phase6 artifact exists: ${file}`);

const layout = read("app/layout.tsx");
const login = read("app/giris/page.tsx") + read("app/giris/LoginClient.tsx") + read("lib/auth/login-search.ts");
const loginSearch = read("lib/auth/login-search.ts");
const account = read("app/hesabim/page.tsx");
const activation = read("app/aktivasyon/page.tsx");
const checkout = read("app/checkout/page.tsx");
const css = read("app/canonical.css");
const pkg = JSON.parse(read("package.json"));
const accountRouter = read("lib/auth/account-router.ts");

check(exists("app/canonical.css") && layout.includes('./canonical.css'), "auth flow is owned by the canonical global stylesheet");
check(login.includes('className="p6-auth-page"'), "login migrated to Phase 6 auth scope");
check(!login.includes('from "qrcode"') && !login.includes("QRCode."), "login no longer ships runtime QR generation");
check(!login.includes("style={{"), "login has no inline style objects");
check(read("app/giris/page.tsx").includes("searchParams") && read("app/giris/page.tsx").includes("force-dynamic") && !read("app/giris/page.tsx").trimStart().startsWith('"use client"'), "login first HTML is a server document of the selected portal");
check(login.includes("initialPortal") && login.includes("resolveLoginReturnPath") && login.includes("resolveLoginDestination"), "one auth foundation resolves individual and corporate contexts from the authenticated account");
check(loginSearch.includes('return value === "business" ? "business" : "individual"') && login.includes("initialPortal"), "corporate login context remains a valid /giris query state");
check(login.includes('messageTone === "error" ? "alert"') && login.includes("authAlert"), "auth errors render on the card as an alert, not only inside a form that can unmount");
check(login.includes("noValidate") && login.includes("resolveLoginDestination"), "login owns its validation messages and account routing");
check(login.includes('setReturnPath(resolveLoginReturnPath(initialPortal, params.get("next")))') && loginSearch.includes("safeLoginNext"), "explicit next destination is sanitized and preserved");
check(login.includes('useState(initialNext') && loginSearch.includes('DEFAULT_INDIVIDUAL_NEXT = "/kartim"') && loginSearch.includes('DEFAULT_BUSINESS_NEXT = "/kurumsal/panel"'), "auth routes directly to the selected card-first or corporate workspace without visible account-check surface");
check(loginSearch.includes('"/kartlarim"') && loginSearch.includes("DEFAULT_WORKSPACE_PATHS"), "legacy individual workspace path is normalized through the canonical login router");
check(login.includes("options: { emailRedirectTo }"), "signup verification preserves auth return destination");
check(login.includes("resetPasswordForEmail"), "forgot-password flow implemented");
check(login.includes('event === "PASSWORD_RECOVERY"'), "Supabase password recovery state handled");
check(login.includes("updateUser({ password })"), "recovered password update implemented");
check(login.includes("validateSignupPassword(password)"), "existing password policy reused for recovery/signup");
check(login.includes("showPassword") && login.includes("Şifreyi göster") && login.includes("Şifreyi gizle"), "password visibility toggle is available across auth password fields");
check(checkout.includes("Hesap açmadan ilerleyebilirsin") && checkout.includes("siparişini daha sonra bu e-posta ile hesabına bağlayabilirsin"), "checkout guests retain an explicit no-account recovery path");
check(!/className="p6-auth-submit"[\s\S]{0,500}<Icon name="external"/.test(login), "auth submit actions do not use external-link semantics");
check(login.includes("resolveLoginDestination") && accountRouter.includes("getBrowserIdentity") && account.includes("resolveServerAccountDestination"), "account authorization is retained before workspace routing");
check(login.includes("setCartOwner(result.data.session.user.id"), "cart ownership claim retained after authentication");
check(login.includes("passwordLogin") && login.includes('isDefaultWorkspacePath(returnPath) ? "/hesabim" : returnPath'), "password login goes through the rate-limited Next.js route and routes through the server workspace resolver");
check(exists("app/api/auth/session/route.ts"), "session cookie is issued by a server route, not document.cookie");
const sessionRoute = read("app/api/auth/session/route.ts");
check(sessionRoute.includes("httpOnly: true") && sessionRoute.includes("auth.getUser"), "session cookie is HttpOnly and token-verified");
check(!sessionRoute.includes("export async function GET") && !sessionRoute.includes("refreshToken: resolved.tokens.refreshToken"), "session route never returns HttpOnly session tokens to browser JavaScript");
const browserClient = read("lib/supabase/browser.ts");
check(browserClient.includes("memoryAuthStorage") && browserClient.includes("purgeLegacyAuthStorage"), "browser supabase client keeps auth tokens in memory and purges disk copies");
check(!browserClient.includes("window.localStorage.setItem(key, value)") && !browserClient.includes("window.sessionStorage.setItem(key, value)"), "browser supabase client does not persist auth tokens in Web Storage");
check(!browserClient.includes('fetch("/api/auth/session"') && !browserClient.includes("setSession"), "browser client never restores HttpOnly session tokens into memory");
const sessionHelper = read("lib/auth/http-only-session.ts");
check(sessionHelper.includes('REFRESH_COOKIE = "yenomi-refresh-token"') && sessionHelper.includes("httpOnly: true"), "refresh token is stored in a separate HttpOnly cookie");
check(sessionHelper.includes("grant_type=refresh_token"), "expired access tokens are rotated through GoTrue refresh");
const authBridge = read("app/components/AuthSessionBridge.tsx");
check(!authBridge.includes("getSupabaseBrowserClient") && authBridge.includes("data-sensitive-obscured"), "global auth bridge protects sensitive screens without hydrating a privileged browser session");
check(read("proxy.ts").includes("resolveMiddlewareSession"), "proxy refreshes HttpOnly session cookies when the access token has expired");
check(accountRouter.includes("getBrowserIdentity") && !accountRouter.includes('from("user_accounts")'), "account router resolves non-secret account identity through the server");
check(accountRouter.includes('ACCOUNT_ROUTE_CORPORATE = "/kurumsal/panel"') && accountRouter.includes('ACCOUNT_ROUTE_INDIVIDUAL = "/kartim"') && accountRouter.includes('ACCOUNT_ROUTE_SERVER = "/hesabim"') && account.includes("resolveServerAccountDestination"), "account router preserves DB-backed corporate routing while making the active card workspace canonical for individual accounts");
check(accountRouter.includes("resolveLoginDestination") && accountRouter.includes("_portal") && account.includes("resolveServerAccountDestination"), "login and account pages route through the authoritative server account router");
check(activation.includes("p6-activation-page"), "legacy activation included in Phase 6 visual continuity");
check(fs.existsSync(path.join(root, "app/api/commerce/activate/route.ts")) && fs.existsSync(path.join(root, "app/api/commerce/claim/route.ts")) && fs.existsSync(path.join(root, "app/api/commerce/activation/resend/route.ts")), "activation business APIs retained");
check(checkout.includes('setCheckoutReturnPath("/checkout")'), "checkout preserves its return path for guest/authenticated payment flow");
check(checkout.includes("bootstrapAuthenticatedCheckout") && read("lib/commerce/checkout-prefill.ts").includes("email: user.email"), "checkout reuses authenticated email instead of asking auth identity twice");

const legacyToken = /var\(--(?:yi|yp|store|ui|y)-/;
check(!legacyToken.test(css), "Phase 6 auth CSS introduces no legacy token family");
check(css.includes(".p6-auth-page") && css.includes(".p6-auth-form-card"), "auth visual layer is present in canonical CSS");
check(css.includes(".p6-auth-portal-tabs") && css.includes(":focus-visible"), "auth interaction and focus treatment remain canonical");
check(css.includes(".p6-auth-portal-tabs a") && css.includes("body:has(.p6-auth-page) .public-site-chrome") && css.includes("pointer-events: auto"), "login tabs stay above public chrome overflow and keep a 44px hit target");
check(css.includes("@media (max-width: 980px)") && css.includes("@media (max-width: 760px)"), "Phase 6 covers tablet and mobile auth layouts");
check(css.includes("prefers-reduced-motion"), "Phase 6 supports reduced motion");
check(css.includes(":focus-visible"), "Phase 6 includes explicit keyboard focus treatment");
check(compareVersion(pkg.version, "25.8.46") >= 0, "package version retains Phase 6 auth or later");
check(pkg.scripts?.["verify:phase6:auth"] === "node scripts/verify-phase6-auth.mjs", "phase6 verifier script registered");

if (failed) process.exit(1);
console.log("\nPhase 6 authentication + activation verification passed.");
