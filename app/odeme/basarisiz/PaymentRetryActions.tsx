"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCheckoutReturnPath,
  setPendingCheckoutOrderId,
} from "../../../lib/payments/browser-checkout";

export default function PaymentRetryActions() {
  const searchParams = useSearchParams();
  const [returnPath, setReturnPath] = useState<"/checkout" | "/nfc-siparis">("/checkout");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoverMessage, setRecoverMessage] = useState("");

  useEffect(() => {
    const nextOrderId = searchParams.get("order");
    if (nextOrderId) setPendingCheckoutOrderId(nextOrderId);
    setOrderId(nextOrderId);
    setReturnPath(getCheckoutReturnPath());
  }, [searchParams]);

  async function recoverPayment() {
    if (!orderId) return;
    setRecovering(true);
    setRecoverMessage("");
    try {
      const response = await fetch("/api/payments/iyzico/recover", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await response.json().catch(() => ({ paid: false }));
      if (data.paid) {
        window.location.href = `/odeme/basarili?order=${encodeURIComponent(orderId)}`;
        return;
      }
      setRecoverMessage(
        data.pending
          ? "Ödeme henüz iyzico’da tamamlanmamış görünüyor. Kartından çekim olduysa birkaç saniye sonra tekrar dene."
          : "Ödeme doğrulanamadı. Aynı sipariş için yeni bir ödeme denemesi başlatabilirsin.",
      );
    } catch {
      setRecoverMessage("Ödeme doğrulanamadı. Kısa süre sonra tekrar dene.");
    } finally {
      setRecovering(false);
    }
  }

  return (
    <>
      <div className="order-success-actions">
        <Link href={returnPath}>Aynı Sipariş İçin Tekrar Dene</Link>
        {orderId ? (
          <Link className="secondary" href={`/odeme/basarili?order=${encodeURIComponent(orderId)}`} onClick={(event) => { event.preventDefault(); void recoverPayment(); }}>
            {recovering ? "Ödeme doğrulanıyor…" : "Ödemeyi doğrula"}
          </Link>
        ) : null}
        <Link className="secondary" href="/siparislerim">Siparişlerimi Gör</Link>
      </div>
      {recoverMessage ? <p role="status">{recoverMessage}</p> : null}
    </>
  );
}
