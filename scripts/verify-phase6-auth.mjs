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
  "app/hesabim/page.tsx",
  "app/aktivasyon/page.tsx",
  "docs/AUTHENTICATION_ACTIVATION_PHASE6_V25.8.46.md",
  "audit/PHASE6_AUTH_ACTIVATION_AUDIT.json"
];
for (const file of required) check(exists(file), `phase6 artifact exists: ${file}`);

const layout = read("app/layout.tsx");
const login = read("app/giris/page.tsx");
const account = read("app/hesabim/page.tsx");
const activation = read("app/aktivasyon/page.tsx");
const checkout = read("app/checkout/page.tsx");
const css = read("app/canonical.css");
const pkg = JSON.parse(read("package.json"));
// v25.8.84 — Faz 22: portal doğrulaması ve hesap yönlendirme mantığı
// component'lerden lib/auth/*'a çıkarıldı (test edilebilirlik için). Bazı
// aşağıdaki kontroller artık sayfa dosyası yerine bu paylaşılan modülleri
// okuyor; davranış aynı, sadece nerede tanımlı olduğu değişti.
const portalGuard = read("lib/auth/portal-guard.ts");
const accountRouter = read("lib/auth/account-router.ts");

check(exists("app/canonical.css") && layout.includes('./canonical.css'), "auth flow is owned by the canonical global stylesheet");
check(login.includes('className="p6-auth-page"'), "login migrated to Phase 6 auth scope");
check(!login.includes('from "qrcode"') && !login.includes("QRCode."), "login no longer ships runtime QR generation");
check(!login.includes("style={{"), "login has no inline style objects");
check(login.includes('role="tablist"') && login.includes("Bireysel") && login.includes("Kurumsal / Ekip"), "one auth foundation exposes individual and corporate contexts");
check(login.includes('portalTabHref("business"') && login.includes("/giris?"), "corporate portal tab remains a real /giris destination");
check(login.includes('role="alert"') && login.includes("authAlert"), "auth errors render on the card as an alert, not only inside a form that can unmount");
check(login.includes("persistActivePortal") && login.includes("noValidate"), "portal persistence cannot abort auth boot; login owns its validation messages");
check(login.includes('setReturnPath(safeNext(params.get("next")))'), "explicit next destination is sanitized and preserved");
check(login.includes('useState("/kartlarim")') && login.includes('nextPortal === "business" ? "/kurumsal/panel" : "/kartlarim"'), "auth routes directly to selected portal workspace without visible account-check surface");
check(login.includes("options: { emailRedirectTo }"), "signup verification preserves auth return destination");
check(login.includes("resetPasswordForEmail"), "forgot-password flow implemented");
check(login.includes('event === "PASSWORD_RECOVERY"'), "Supabase password recovery state handled");
check(login.includes("updateUser({ password })"), "recovered password update implemented");
check(login.includes("validateSignupPassword(password)"), "existing password policy reused for recovery/signup");
check(login.includes("showPassword") && login.includes("Şifreyi göster") && login.includes("Şifreyi gizle"), "password visibility toggle is available across auth password fields");
check(login.includes("/kurumsal#teklif") && login.includes("Kurumsal teklif formuna git"), "corporate auth has a real lead CTA");
check(!/className="p6-auth-submit"[\s\S]{0,500}<Icon name="external"/.test(login), "auth submit actions do not use external-link semantics");
check(login.includes("validatePortal") && portalGuard.includes('from("user_accounts")'), "existing account portal authorization retained (validatePortal extracted to lib/auth/portal-guard.ts)");
check(login.includes("setCartOwner(result.data.session.user.id"), "cart ownership claim retained after authentication");
check(login.includes("passwordLogin") && login.includes("writeSessionCookie"), "password login goes through the rate-limited Next.js route and still persists HttpOnly cookies");
check(portalGuard.includes("AbortSignal.timeout"), "admin session check cannot hang the login redirect");
check(exists("app/api/auth/session/route.ts"), "session cookie is issued by a server route, not document.cookie");
const sessionRoute = read("app/api/auth/session/route.ts");
check(sessionRoute.includes("httpOnly: true") && sessionRoute.includes("auth.getUser"), "session cookie is HttpOnly and token-verified");
check(sessionRoute.includes("export async function GET") && sessionRoute.includes("refreshToken"), "session route restores tokens from HttpOnly cookies via GET");
const browserClient = read("lib/supabase/browser.ts");
check(browserClient.includes("memoryAuthStorage") && browserClient.includes("purgeLegacyAuthStorage"), "browser supabase client keeps auth tokens in memory and purges disk copies");
check(!browserClient.includes("window.localStorage.setItem(key, value)") && !browserClient.includes("window.sessionStorage.setItem(key, value)"), "browser supabase client does not persist auth tokens in Web Storage");
check(browserClient.includes('fetch("/api/auth/session"') && browserClient.includes("setSession"), "reload restores the in-memory session from the HttpOnly session route");
const sessionHelper = read("lib/auth/http-only-session.ts");
check(sessionHelper.includes('REFRESH_COOKIE = "yenomi-refresh-token"') && sessionHelper.includes("httpOnly: true"), "refresh token is stored in a separate HttpOnly cookie");
check(sessionHelper.includes("grant_type=refresh_token"), "expired access tokens are rotated through GoTrue refresh");
const authBridge = read("app/components/AuthSessionBridge.tsx");
check(authBridge.includes("refresh_token") && authBridge.includes("INITIAL_SESSION"), "auth bridge writes refresh cookies and does not clear cookies on an empty initial session");
check(read("middleware.ts").includes("resolveMiddlewareSession"), "middleware refreshes HttpOnly session cookies when the access token has expired");
check(accountRouter.includes('from("user_accounts")') && accountRouter.includes('account_type'), "account router resolves the canonical user account type before portal routing");
check(accountRouter.includes('ACCOUNT_ROUTE_CORPORATE = "/kurumsal/panel"') && accountRouter.includes('ACCOUNT_ROUTE_INDIVIDUAL = "/kartlarim"') && account.includes("resolveAccountDestination"), "account router resolves corporate versus individual destination (lib/auth/account-router.ts)");
check(activation.includes("p6-activation-page"), "legacy activation included in Phase 6 visual continuity");
check(fs.existsSync(path.join(root, "app/api/commerce/activate/route.ts")) && fs.existsSync(path.join(root, "app/api/commerce/claim/route.ts")) && fs.existsSync(path.join(root, "app/api/commerce/activation/resend/route.ts")), "activation business APIs retained");
check(checkout.includes('setCheckoutReturnPath("/checkout")'), "checkout preserves its return path for guest/authenticated payment flow");
check(checkout.includes('email: session.user.email ?? current.email'), "checkout reuses authenticated email instead of asking auth identity twice");

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
