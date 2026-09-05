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

  useEffect(() => {
    const nextOrderId = searchParams.get("order");
    if (nextOrderId) setPendingCheckoutOrderId(nextOrderId);
    setReturnPath(getCheckoutReturnPath());
  }, [searchParams]);

  return (
    <>
      <div className="order-success-actions">
        <Link href={returnPath}>Aynı Sipariş İçin Tekrar Dene</Link>
        <Link className="secondary" href="/siparislerim">Siparişlerimi Gör</Link>
      </div>
    </>
  );
}
