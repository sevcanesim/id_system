"use client";

import { useRouter } from "next/navigation";
import { addCartItem, cartAddConflict, cartAddConflictMessage, readCart, type ProductKind } from "../../lib/cart";
import { COMMERCIAL_SKUS } from "../../lib/config/commercial";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

type Props = {
  productId: string;
  variantSku?: string;
  kind: ProductKind;
  name: string;
  unitPriceKurus: number;
  label: string;
  className?: string;
  destination?: "/sepet" | "/checkout";
  appearance?: "primary" | "secondary";
  configuration?: Record<string, unknown>;
};

function physicalOnlySku(sku?: string) {
  return sku === COMMERCIAL_SKUS.ADDITIONAL_CARD || sku === COMMERCIAL_SKUS.REPLACEMENT_CARD;
}

export default function AddToCartButton({
  productId,
  variantSku,
  kind,
  name,
  unitPriceKurus,
  label,
  className,
  destination = "/sepet",
  appearance = "primary",
  configuration,
}: Props) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={`${appearance} ds-button ${appearance === "primary" ? "ds-button--primary" : ""} add-to-cart-button${className ? ` ${className}` : ""}`}
      onClick={() => {
        void (async () => {
          if (physicalOnlySku(variantSku)) {
            const supabase = getSupabaseBrowserClient();
            const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
            if (!data.session) {
              const next = `${window.location.pathname}${window.location.search}` || destination;
              router.push(`/giris?next=${encodeURIComponent(next)}`);
              return;
            }
            const entitlementResponse = await fetch("/api/commerce/entitlements", {
              headers: { authorization: `Bearer ${data.session.access_token}` },
              cache: "no-store",
            });
            const payload = entitlementResponse.ok ? await entitlementResponse.json() as { active?: boolean } : { active: false };
            if (!payload.active) {
              router.push("/urunler/nfc-kart?reason=access-required");
              return;
            }
          }
          const conflict = cartAddConflict(variantSku, readCart());
          if (conflict && !window.confirm(cartAddConflictMessage(conflict))) return;
          addCartItem({ productId, variantSku, kind, name, unitPriceKurus, quantity: 1, configuration });
          router.push(destination);
        })();
      }}
    >
      {label}
    </button>
  );
}
