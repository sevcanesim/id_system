"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "../../components/AppHeader";

type HeaderAction = { href: string; label: string; primary?: boolean };

export default function PaymentSuccessHeader({ fallbackActions }: { fallbackActions: HeaderAction[] }) {
  const searchParams = useSearchParams();
  const resultReference = searchParams.get("result");
  const [actions, setActions] = useState(fallbackActions);

  useEffect(() => {
    if (!resultReference) return;
    let active = true;
    fetch(`/api/commerce/orders/status?result=${encodeURIComponent(resultReference)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { activationRequired?: boolean; corporate?: boolean; corporateReady?: boolean; seatPack?: boolean; seatPackFulfillment?: "FULFILLED" | "FAILED" | "PENDING" | null } | null) => {
        if (!active || !data) return;
        if (data.activationRequired) {
          setActions([{ href: "/aktivasyon", label: "Hesabımı Bağla", primary: true }]);
          return;
        }
        if (data.seatPack) {
          const href = data.seatPackFulfillment === "FULFILLED" ? "/kurumsal/panel/calisanlar" : "/kurumsal/panel/kartlar";
          setActions([{ href, label: "Kurumsal Panel", primary: true }]);
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
  }, [resultReference]);

  return <AppHeader actions={actions} showDefaultCta={false} />;
}
