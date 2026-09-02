"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
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
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { if (!cancelled) setState("signed-out"); return; }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { if (!cancelled) setState("signed-out"); return; }
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;

      if (aalData?.currentLevel === "aal2") {
        setState("secure");
        return;
      }

      setState("mfa-required");
      if (pathname !== "/admin/security") {
        const next = pathname.startsWith("/admin") ? pathname : "/admin";
        router.replace(`/admin/security?next=${encodeURIComponent(next)}`);
      }
    }
    void check();
    return () => { cancelled = true; };
  }, [pathname, router]);

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { router.replace("/giris"); return; }
    setBusy(true);
    await supabase.auth.signOut();
    router.replace("/giris");
    router.refresh();
  }

  if (state === "signed-out") return null;

  return <aside className={styles.dock} aria-label="Super Admin navigasyonu">
    {state === "mfa-required" && pathname !== "/admin/security" && <Link className={styles.warning} href={`/admin/security?next=${encodeURIComponent(pathname)}`}>Google Authenticator doğrulaması gerekli</Link>}
    <div className={styles.actions}>
      <Link className={isActive(pathname, "/admin") ? styles.active : ""} href="/admin">Satışlar</Link>
      <Link className={isActive(pathname, "/admin/operations") ? styles.active : ""} href="/admin/operations">Operasyon</Link>
      <Link className={isActive(pathname, "/admin/access") ? styles.active : ""} href="/admin/access">Yönetici Erişimi</Link>
      <Link className={isActive(pathname, "/admin/security") ? styles.active : ""} href="/admin/security">Güvenlik</Link>
      <Link className={isActive(pathname, "/admin/devir-rehberi") ? styles.active : ""} href="/admin/devir-rehberi">Devir Rehberi</Link>
      <button type="button" onClick={() => void signOut()} disabled={busy}>{busy ? "Çıkılıyor…" : "Çıkış Yap"}</button>
    </div>
  </aside>;
}
