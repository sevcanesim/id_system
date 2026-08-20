"use client";

import { useEffect } from "react";
import { clearLegacyCart, setCartOwner } from "../../lib/cart";
import { getRememberedLogin, getSupabaseBrowserClient } from "../../lib/supabase/browser";

/**
 * Mirrors the Supabase access + refresh tokens into HttpOnly cookies so
 * middleware can authorize private routes and the browser can restore the
 * in-memory supabase-js session after a reload. Tokens are written only after
 * `/api/auth/session` verifies the access token. They are never stored in
 * `localStorage` / `sessionStorage`.
 */
export async function writeSessionCookie(
  token: string | null,
  expiresAt?: number | null,
  refreshToken?: string | null,
) {
  if (typeof window === "undefined") return;
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      accessToken: token,
      expiresAt: expiresAt ?? null,
      refreshToken: refreshToken ?? null,
      remember: getRememberedLogin().remember,
    }),
  });
}

export default function AuthSessionBridge() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      void writeSessionCookie(
        data.session.access_token,
        data.session.expires_at,
        data.session.refresh_token,
      );
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearLegacyCart();
        setCartOwner(null, { claimGuest: false });
      }
      if (event === "INITIAL_SESSION" && !session) return;
      void writeSessionCookie(
        session?.access_token ?? null,
        session?.expires_at,
        session?.refresh_token ?? null,
      );
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return null;
}
