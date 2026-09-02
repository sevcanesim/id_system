"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import styles from "./OrdersPage.module.css";

export default function ResumePaymentButton({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function resumePayment() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      const token = data.session?.access_token;
      if (!token) {
        window.location.assign(`/giris?next=${encodeURIComponent("/siparislerim")}`);
        return;
      }

      const response = await fetch(`/api/commerce/orders/${encodeURIComponent(orderId)}/resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.href !== "string") {
        throw new Error(typeof payload.error === "string" ? payload.error : "Ödeme devam bağlantısı oluşturulamadı.");
      }
      window.location.assign(payload.href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ödeme şu anda devam ettirilemiyor.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.paymentResume}>
      <button className={styles.paymentResumeButton} type="button" onClick={resumePayment} disabled={busy}>
        {busy ? "Ödeme hazırlanıyor…" : "Ödemeyi Tamamla"}
      </button>
      {error && <p className={styles.paymentResumeError} role="alert">{error}</p>}
    </div>
  );
}
