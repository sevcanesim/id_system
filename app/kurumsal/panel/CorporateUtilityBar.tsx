"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import styles from "./CorporateUtilityBar.module.css";

export default function CorporateUtilityBar() {
  const [email, setEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    void supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setEmail(data.user?.email || "");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className={styles.bar} aria-label="Kurumsal hesap araçları">
      <div className={styles.account}>
        <span className={styles.label}>HESAP</span>
        <span className={styles.email}>{email || "—"}</span>
      </div>
      <nav className={styles.actions} aria-label="Hızlı bağlantılar">
        <Link href="/destek">Yardım</Link>
        <Link href="/">Siteye dön</Link>
      </nav>
    </header>
  );
}
