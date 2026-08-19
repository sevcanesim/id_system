"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

/**
 * Mirrors the Supabase access token into an HttpOnly cookie so middleware can
 * authorize private routes without exposing the JWT on `document.cookie`.
 * The cookie is written only after `/api/auth/session` verifies the token.
 */
export async function writeSessionCookie(token: string | null, expiresAt?: number | null) {
  if (typeof window === "undefined") return;
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ accessToken: token, expiresAt: expiresAt ?? null }),
  });
}

export default function AuthSessionBridge() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      void writeSessionCookie(data.session?.access_token ?? null, data.session?.expires_at);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void writeSessionCookie(session?.access_token ?? null, session?.expires_at);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
