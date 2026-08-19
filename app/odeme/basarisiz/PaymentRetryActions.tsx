"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getCheckoutReturnPath,
  rotateCheckoutIdempotencyKey,
  setPendingCheckoutOrderId,
} from "../../../lib/payments/browser-checkout";

export default function PaymentRetryActions() {
  const searchParams = useSearchParams();
  const [returnPath, setReturnPath] = useState<"/checkout" | "/nfc-siparis">("/checkout");

  useEffect(() => {
    const orderId = searchParams.get("order");
    if (orderId) setPendingCheckoutOrderId(orderId);
    rotateCheckoutIdempotencyKey();
    setReturnPath(getCheckoutReturnPath());
  }, [searchParams]);

  return (
    <div className="order-success-actions">
      <Link href={returnPath}>Aynı Sipariş İçin Tekrar Dene</Link>
      <Link className="secondary" href="/siparislerim">Siparişlerimi Gör</Link>
    </div>
  );
}
