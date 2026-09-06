"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCheckoutReturnPath } from "../../../lib/payments/browser-checkout";

export default function PaymentRetryActions() {
  const [returnPath, setReturnPath] = useState<"/checkout" | "/nfc-siparis">("/checkout");

  useEffect(() => {
    setReturnPath(getCheckoutReturnPath());
  }, []);

  return (
    <>
      <div className="order-success-actions">
        <Link href={returnPath}>Aynı Sipariş İçin Tekrar Dene</Link>
        <Link className="secondary" href="/siparislerim">Siparişlerimi Gör</Link>
      </div>
    </>
  );
}
