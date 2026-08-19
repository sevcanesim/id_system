import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

let client: SupabaseClient | null = null;
const REMEMBER_SESSION_KEY = "yenomi-remember-session";
const REMEMBERED_EMAIL_KEY = "yenomi-remembered-email";

function browserStorage() {
  return {
    getItem(key: string) {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      if (window.localStorage.getItem(REMEMBER_SESSION_KEY) === "true") {
        window.sessionStorage.removeItem(key);
        window.localStorage.setItem(key, value);
      } else {
        window.localStorage.removeItem(key);
        window.sessionStorage.setItem(key, value);
      }
    },
    removeItem(key: string) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}

export function setRememberedLogin(remember: boolean, email?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_SESSION_KEY, String(remember));
  if (remember && email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
  else if (!remember) window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}

export function getRememberedLogin() {
  if (typeof window === "undefined") return { remember: false, email: "" };
  const remember = window.localStorage.getItem(REMEMBER_SESSION_KEY) === "true";
  const storedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  // Demo/test identities must never appear as a production-facing login default.
  if (storedEmail.toLowerCase().endsWith("@yenomi.test")) {
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    return { remember, email: "" };
  }
  return { remember, email: storedEmail };
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, storage: browserStorage() },
  });
  return client;
}
