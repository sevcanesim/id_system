"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./AdminSecurityDock.module.css";

type SecurityState = "loading" | "secure" | "mfa-required" | "signed-out";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSecurityDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<SecurityState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const response = await fetch("/api/admin/security/status", { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) { if (!cancelled) setState("signed-out"); return; }
        const security = await response.json().catch(() => null) as { aal?: string } | null;
        if (cancelled) return;

        if (security?.aal === "aal2") {
          setState("secure");
          return;
        }

        setState("mfa-required");
        if (pathname !== "/admin/security") {
          const next = pathname.startsWith("/admin") ? pathname : "/admin";
          router.replace(`/admin/security?next=${encodeURIComponent(next)}`);
        }
      } catch {
        if (!cancelled) setState("signed-out");
      }
    }
    void check();
    return () => { cancelled = true; };
  }, [pathname, router]);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    router.replace("/giris");
    router.refresh();
  }

  if (state === "signed-out") return null;

  return <header className={styles.dock} aria-label="Super Admin navigasyonu">
    <div className={styles.brand}>
      <span className={styles.mark}>Y</span>
      <div className={styles.brandText}><strong>Yenomi ID</strong><small>Super Admin</small></div>
    </div>
    <div className={styles.center}>
      {state === "mfa-required" && pathname !== "/admin/security" && <Link className={styles.warning} href={`/admin/security?next=${encodeURIComponent(pathname)}`}>Google Authenticator doğrulaması gerekli</Link>}
      <div className={styles.actions}>
        <Link className={isActive(pathname, "/admin/overview") ? styles.active : ""} href="/admin/overview">Overview</Link>
        <Link className={isActive(pathname, "/admin") ? styles.active : ""} href="/admin">Satışlar</Link>
        <Link className={isActive(pathname, "/admin/operations") ? styles.active : ""} href="/admin/operations">Operasyon</Link>
        <Link className={isActive(pathname, "/admin/support") ? styles.active : ""} href="/admin/support">Destek</Link>
        <Link className={isActive(pathname, "/admin/access") ? styles.active : ""} href="/admin/access">Yönetici Erişimi</Link>
        <Link className={isActive(pathname, "/admin/security") ? styles.active : ""} href="/admin/security">Güvenlik</Link>
        <Link className={isActive(pathname, "/admin/devir-rehberi") ? styles.active : ""} href="/admin/devir-rehberi">Devir Rehberi</Link>
        <Link href="/">Siteyi Gör</Link>
        <button type="button" onClick={() => void signOut()} disabled={busy}>{busy ? "Çıkılıyor…" : "Çıkış Yap"}</button>
      </div>
    </div>
    <span className={styles.live}>GERÇEK VERİ</span>
  </header>;
}
