import { readFileSync } from "node:fs";

const browser = readFileSync("lib/supabase/browser.ts", "utf8");
const bridge = readFileSync("app/components/AuthSessionBridge.tsx", "utf8");
const session = readFileSync("app/api/auth/session/route.ts", "utf8");
const helper = readFileSync("lib/auth/http-only-session.ts", "utf8");
const middleware = readFileSync("middleware.ts", "utf8");
const login = readFileSync("app/giris/page.tsx", "utf8");

function requireText(source, token, message) {
  if (!source.includes(token)) throw new Error(message);
}

function forbidText(source, token, message) {
  if (source.includes(token)) throw new Error(message);
}

requireText(browser, "memoryAuthStorage", "Browser client must persist supabase auth in memory only.");
requireText(browser, "purgeLegacyAuthStorage", "Browser client must remove leftover sb- auth tokens from Web Storage.");
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
requireText(helper, 'REFRESH_COOKIE = "yenomi-refresh-token"', "Refresh token must use a dedicated HttpOnly cookie.");
requireText(helper, "grant_type=refresh_token", "Server must rotate expired access tokens through GoTrue.");
requireText(helper, "httpOnly: true", "Shared cookie helper must set HttpOnly.");
forbidText(session, "console.error(\"auth session cookie error\", parsed", "Session route must not log token payloads.");

requireText(bridge, "refresh_token", "Auth bridge must persist the refresh token, not only the access token.");
requireText(bridge, "INITIAL_SESSION", "Auth bridge must ignore an empty INITIAL_SESSION so restore is not wiped.");
requireText(bridge, "getRememberedLogin", "Refresh cookie lifetime must follow remember-me.");

requireText(middleware, "resolveMiddlewareSession", "Middleware must accept a rotated refresh session, not only a live access cookie.");
requireText(middleware, "applySessionCookies", "Middleware must write rotated HttpOnly cookies onto the response.");
requireText(middleware, "clearSessionCookies", "Failed protected-page auth must clear access and refresh cookies.");

requireText(login, "data.session.refresh_token", "Password login must hand the refresh token to the session cookie route.");

console.log("HttpOnly supabase session contract: PASS");
