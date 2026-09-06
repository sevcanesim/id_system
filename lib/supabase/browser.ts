import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

let client: SupabaseClient | null = null;
let restorePromise: Promise<void> | null = null;
const REMEMBER_SESSION_KEY = "yenomi-remember-session";

/**
 * In-memory Map used as supabase-js `auth.storage`. persistSession stays true
 * so the SDK refreshes the heap session, but nothing is written to
 * localStorage/sessionStorage. Legacy `sb-*-auth-token` keys are purged on
 * restore. Remember-me stores only a non-secret preference flag.
 */
function memoryAuthStorage() {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

function isSupabaseAuthStorageKey(key: string) {
  return key.startsWith("sb-") && key.includes("auth-token");
}

function parseLegacyAuthValue(raw: string): { access_token: string; refresh_token: string } | null {
  try {
    const parsed = JSON.parse(raw) as { currentSession?: unknown; access_token?: unknown; refresh_token?: unknown };
    const session = (parsed.currentSession && typeof parsed.currentSession === "object" ? parsed.currentSession : parsed) as {
      access_token?: unknown;
      refresh_token?: unknown;
    };
    if (typeof session.access_token === "string" && typeof session.refresh_token === "string") {
      return { access_token: session.access_token, refresh_token: session.refresh_token };
    }
  } catch {
    return null;
  }
  return null;
}

function readLegacyStoredSession() {
  if (typeof window === "undefined") return null;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !isSupabaseAuthStorageKey(key)) continue;
      const raw = storage.getItem(key);
      if (!raw) continue;
      const session = parseLegacyAuthValue(raw);
      if (session) return session;
    }
  }
  return null;
}

function purgeLegacyAuthStorage() {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key && isSupabaseAuthStorageKey(key)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  }
}

function urlHasSupabaseAuthParams() {
  if (typeof window === "undefined") return false;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return ["access_token", "refresh_token", "code"].some((key) => search.has(key) || hash.has(key));
}

async function restoreBrowserSession(target: SupabaseClient) {
  if (typeof window === "undefined") return;
  const legacy = readLegacyStoredSession();
  purgeLegacyAuthStorage();
  if (urlHasSupabaseAuthParams()) return;

  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "x-yenomi-session": "1" },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const payload = (await response.json()) as { accessToken?: unknown; refreshToken?: unknown };
      if (typeof payload.accessToken === "string" && typeof payload.refreshToken === "string") {
        await target.auth.setSession({
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken,
        });
        return;
      }
    }
  } catch {
    // Cookie restore is best-effort; legacy storage below still runs.
  }

  if (!legacy) return;
  await target.auth.setSession({
    access_token: legacy.access_token,
    refresh_token: legacy.refresh_token,
  });
}

function wrapAuthUntilRestored(target: SupabaseClient, restored: Promise<void>) {
  const originalGetSession = target.auth.getSession.bind(target.auth);
  const originalGetUser = target.auth.getUser.bind(target.auth);
  target.auth.getSession = (async () => {
    await restored;
    return originalGetSession();
  }) as typeof target.auth.getSession;
  target.auth.getUser = (async (jwt?: string) => {
    if (!jwt) await restored;
    return originalGetUser(jwt);
  }) as typeof target.auth.getUser;
}

export function setRememberedLogin(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_SESSION_KEY, String(remember));
}

export function getRememberedLogin() {
  if (typeof window === "undefined") return { remember: false, email: "" };
  const remember = window.localStorage.getItem(REMEMBER_SESSION_KEY) === "true";
  return { remember, email: "" };
}

export async function hydrateBrowserSessionFromCookies(): Promise<boolean> {
  const target = getSupabaseBrowserClient();
  if (!target) return false;
  if (restorePromise) await restorePromise;
  await restoreBrowserSession(target);
  const { data } = await target.auth.getSession();
  return Boolean(data.session?.access_token && data.session.refresh_token);
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: memoryAuthStorage(),
      },
    });
    restorePromise = restoreBrowserSession(client);
    wrapAuthUntilRestored(client, restorePromise);
  }
  return client;
}

export async function clearBrowserAuthSession() {
  if (!client) return;
  await client.auth.signOut({ scope: "local" });
}
