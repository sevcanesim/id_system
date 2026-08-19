"use client";

import { useRouter } from "next/navigation";
import { addCartItem, type ProductKind } from "../../lib/cart";

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
  return (
    <button
      type="button"
      className={`${appearance} ds-button ${appearance === "primary" ? "ds-button--primary" : ""} add-to-cart-button${className ? ` ${className}` : ""}`}
      onClick={() => {
        addCartItem({ productId, variantSku, kind, name, unitPriceKurus, quantity: 1, configuration });
        router.push(destination);
      }}
    >
      {label}
    </button>
  );
}
