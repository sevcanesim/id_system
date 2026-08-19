"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

const COOKIE_NAME = "yenomi-access-token";

export function writeSessionCookie(token: string | null, expiresAt?: number | null) {
  if (typeof document === "undefined") return;
  if (!token) {
    document.cookie = `${COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  const maxAge = expiresAt ? Math.max(60, expiresAt - Math.floor(Date.now() / 1000)) : 3600;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export default function AuthSessionBridge() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      writeSessionCookie(data.session?.access_token ?? null, data.session?.expires_at);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      writeSessionCookie(session?.access_token ?? null, session?.expires_at);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
