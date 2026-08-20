"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "../../components/AppHeader";

type HeaderAction = { href: string; label: string; primary?: boolean };

export default function PaymentSuccessHeader({ fallbackActions }: { fallbackActions: HeaderAction[] }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [actions, setActions] = useState(fallbackActions);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    fetch(`/api/commerce/orders/status?order=${encodeURIComponent(orderId)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { activationRequired?: boolean; corporate?: boolean; corporateReady?: boolean } | null) => {
        if (!active || !data) return;
        if (data.activationRequired) {
          setActions([{ href: "/aktivasyon", label: "Hesabımı Bağla", primary: true }]);
          return;
        }
        if (data.corporate) {
          setActions(data.corporateReady
            ? [{ href: "/kurumsal/panel", label: "Kurumsal Panel", primary: true }]
            : [{ href: "/siparislerim", label: "Siparişlerim", primary: true }]);
          return;
        }
        setActions([{ href: "/siparislerim", label: "Siparişlerim", primary: true }]);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [orderId]);

  return <AppHeader context="Ödeme Başarılı" actions={actions} />;
}
