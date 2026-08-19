"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { writeCart } from "../../../lib/cart";
import { clearPendingCheckoutOrderId, rotateCheckoutIdempotencyKey } from "../../../lib/payments/browser-checkout";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";

export default function ActivationAction() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    writeCart([]);
    clearPendingCheckoutOrderId();
    rotateCheckoutIdempotencyKey();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/commerce/entitlements", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
      setReady(response.ok && Boolean((await response.json()).active));
    });
  }, []);

  return <div className="activation-callout">
    <h2>{ready ? "Yenomi ID hizmetin hesabına tanımlandı" : "Kartvizitin için her şey hazır"}</h2>
    <p>Aktivasyon koduyla uğraşmana gerek yok. Şimdi kartvizit bilgilerini doldur; fiziksel kartın bu profile bağlansın.</p>
    <Link href="/olustur?source=purchase">Kartvizit Bilgilerimi Doldur →</Link>
  </div>;
}
