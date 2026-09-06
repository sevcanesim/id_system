"use client";

import { useEffect } from "react";
import { getRememberedLogin } from "../../lib/supabase/browser";

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

    return () => {
      document.removeEventListener("visibilitychange", syncObscure);
      window.removeEventListener("pageshow", syncObscure);
      document.documentElement.removeAttribute("data-sensitive-obscured");
    };
  }, []);

  return null;
}
