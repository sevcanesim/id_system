import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

let client: SupabaseClient | null = null;
const REMEMBER_SESSION_KEY = "yenomi-remember-session";

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

export function setRememberedLogin(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_SESSION_KEY, String(remember));
}

export function getRememberedLogin() {
  if (typeof window === "undefined") return { remember: false, email: "" };
  const remember = window.localStorage.getItem(REMEMBER_SESSION_KEY) === "true";
  return { remember, email: "" };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    purgeLegacyAuthStorage();
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: true,
        storage: memoryAuthStorage(),
      },
    });
  }
  return client;
}

export async function clearBrowserAuthSession() {
  if (!client) return;
  await client.auth.signOut({ scope: "local" });
}
