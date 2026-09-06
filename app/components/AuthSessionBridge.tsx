"use client";

import { useEffect } from "react";
import { clearLegacyCart, setCartOwner } from "../../lib/cart";
import { getRememberedLogin, getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { clearSensitiveBrowserState } from "../../lib/security/client-private-state";

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
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "content-type": "application/json", "x-yenomi-session": "1" },
      credentials: "same-origin",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        accessToken: token,
        expiresAt: expiresAt ?? null,
        refreshToken: refreshToken ?? null,
        remember: getRememberedLogin().remember,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const SENSITIVE_PATH_PREFIXES = [
  "/checkout",
  "/odeme",
  "/aktivasyon",
  "/nfc-siparis",
  "/admin",
  "/kurumsal/panel",
  "/leadler",
  "/kartim",
  "/kartlarim",
  "/hesabim",
  "/siparislerim",
  "/ayarlar",
  "/istatistikler",
];

function isSensitivePath(pathname: string) {
  return SENSITIVE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function AuthSessionBridge() {
  useEffect(() => {
    const syncObscure = () => {
      const hide = isSensitivePath(window.location.pathname) && document.visibilityState !== "visible";
      document.documentElement.toggleAttribute("data-sensitive-obscured", hide);
    };
    syncObscure();
    document.addEventListener("visibilitychange", syncObscure);
    window.addEventListener("pageshow", syncObscure);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return () => {
        document.removeEventListener("visibilitychange", syncObscure);
        window.removeEventListener("pageshow", syncObscure);
        document.documentElement.removeAttribute("data-sensitive-obscured");
      };
    }

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
        clearSensitiveBrowserState();
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

    return () => {
      listener.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", syncObscure);
      window.removeEventListener("pageshow", syncObscure);
      document.documentElement.removeAttribute("data-sensitive-obscured");
    };
  }, []);

  return null;
}
