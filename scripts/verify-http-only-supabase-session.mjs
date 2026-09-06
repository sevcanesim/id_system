import { readFileSync } from "node:fs";

const browser = readFileSync("lib/supabase/browser.ts", "utf8");
const bridge = readFileSync("app/components/AuthSessionBridge.tsx", "utf8");
const session = readFileSync("app/api/auth/session/route.ts", "utf8");
const sessionIdentity = readFileSync("app/api/auth/session/identity/route.ts", "utf8");
const helper = readFileSync("lib/auth/http-only-session.ts", "utf8");
const middleware = readFileSync("proxy.ts", "utf8");
const login = readFileSync("app/giris/page.tsx", "utf8") + readFileSync("app/giris/LoginClient.tsx", "utf8");
const passwordLogin = readFileSync("lib/auth/password-login.ts", "utf8");

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

const loginApi = readFileSync("app/api/auth/login/route.ts", "utf8");
requireText(loginApi, "applySessionCookies", "Password login must set HttpOnly cookies on the server.");
requireText(loginApi, "productionTestLoginBlocked", "Password login must refuse production demo identities.");

console.log("HttpOnly supabase session contract: PASS");
