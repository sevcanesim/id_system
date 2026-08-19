"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { writeCart } from "../../../lib/cart";
import { normalizeEmailField } from "../../../lib/form-standards";
import { clearPendingCheckoutOrderId, rotateCheckoutIdempotencyKey } from "../../../lib/payments/browser-checkout";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";

export default function ActivationAction({ activationRequired }: { activationRequired: boolean }) {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    writeCart([]);
    clearPendingCheckoutOrderId();
    rotateCheckoutIdempotencyKey();
    if (activationRequired) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/commerce/entitlements", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      setReady(response.ok && Boolean((await response.json()).active));
    });
  }, [activationRequired]);

  async function resend(event: FormEvent) {
    event.preventDefault();
    setResending(true);
    setMessage("");
    try {
      const response = await fetch("/api/commerce/activation/resend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalizeEmailField(email) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bağlantı gönderilemedi.");
      setMessage(data.message || "Uygun bir sipariş bulunursa yeni bağlantı gönderildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bağlantı gönderilemedi.");
    } finally {
      setResending(false);
    }
  }

  if (activationRequired) {
    return (
      <div className="activation-callout">
        <h2>Hesabını e-postadaki bağlantı ile aç</h2>
        <p>Aktivasyon bağlantısı sipariş e-postana gönderildi. Bağlantı 7 gün geçerlidir. Mail gelmediyse aynı adresi yazarak yeniden gönderebilirsin.</p>
        <form onSubmit={resend}>
          <label>Sipariş e-postası
            <input
              required
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setEmail(normalizeEmailField(email))}
              placeholder="ornek@mail.com"
            />
          </label>
          {message ? <div className="checkout-message">{message}</div> : null}
          <button type="submit" disabled={resending || !email.trim()}>{resending ? "Gönderiliyor…" : "Bağlantıyı Yeniden Gönder"}</button>
        </form>
        <Link href="/aktivasyon">Aktivasyon sayfasını aç →</Link>
      </div>
    );
  }

  return (
    <div className="activation-callout">
      <h2>{ready ? "Yenomi ID hizmetin hesabına tanımlandı" : "Kartvizitin için her şey hazır"}</h2>
      <p>Aktivasyon koduyla uğraşmana gerek yok. Şimdi kartvizit bilgilerini doldur; fiziksel kartın bu profile bağlansın.</p>
      <Link href="/olustur?source=purchase">Kartvizit Bilgilerimi Doldur →</Link>
    </div>
  );
}
