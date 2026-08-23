"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { addCartItem, cartAddConflict, cartAddConflictMessage, readCart, type ProductKind } from "../../lib/cart";
import {
  isPhysicalAddonSku,
  physicalAddonCartCopy,
  physicalAddonCartGate,
  type PhysicalAddonCartGate,
} from "../../lib/commerce/physical-addon-access";
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
  const hintId = useId();
  const requiresAccount = isPhysicalAddonSku(variantSku);
  const [gate, setGate] = useState<PhysicalAddonCartGate | "checking">(requiresAccount ? "checking" : "ready");

  useEffect(() => {
    if (!requiresAccount) {
      setGate("ready");
      return;
    }
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
      if (!data.session) {
        if (!cancelled) setGate("guest");
        return;
      }
      const entitlementResponse = await fetch("/api/commerce/entitlements", {
        headers: { authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      const payload = entitlementResponse.ok
        ? await entitlementResponse.json() as { active?: boolean }
        : { active: false };
      if (!cancelled) {
        setGate(physicalAddonCartGate({
          authenticated: true,
          activeEntitlement: Boolean(payload.active),
        }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requiresAccount]);

  const copy = requiresAccount && gate !== "checking"
    ? physicalAddonCartCopy(gate, label)
    : { label, hint: null, loginAction: null };
  const blocked = requiresAccount && gate !== "ready";
  const classNames = `${appearance} ds-button ${appearance === "primary" ? "ds-button--primary" : ""} add-to-cart-button${className ? ` ${className}` : ""}`;

  async function addToCart() {
    if (blocked) return;
    const conflict = cartAddConflict(variantSku, readCart());
    if (conflict && !window.confirm(cartAddConflictMessage(conflict))) return;
    addCartItem({ productId, variantSku, kind, name, unitPriceKurus, quantity: 1, configuration });
    router.push(destination);
  }

  function goToLogin() {
    const next = `${window.location.pathname}${window.location.search}` || "/urunler";
    router.push(`/giris?next=${encodeURIComponent(next)}`);
  }

  const button = (
    <button
      type="button"
      className={classNames}
      disabled={blocked}
      aria-disabled={blocked || undefined}
      aria-describedby={copy.hint ? hintId : undefined}
      onClick={() => {
        void addToCart();
      }}
    >
      {copy.label}
    </button>
  );

  if (!requiresAccount) return button;

  return (
    <>
      {copy.hint ? (
        <p id={hintId} role="status">{copy.hint}</p>
      ) : null}
      {copy.loginAction ? (
        <button type="button" className="ds-button add-to-cart-button" onClick={goToLogin}>
          {copy.loginAction}
        </button>
      ) : null}
      {button}
    </>
  );
}
