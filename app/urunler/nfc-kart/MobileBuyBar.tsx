"use client";

import { useEffect, useState } from "react";
import AddToCartButton from "../../components/AddToCartButton";
import type { CatalogProduct, ProductVariant } from "../../../lib/config/product";

/**
 * Mobile sticky "Sepete Ekle" bar for the NFC PDP.
 *
 * P1 QA finding: the bar used to be fixed and visible from first paint,
 * which put it directly on top of the hero's own price/CTA row before the
 * shopper had scrolled at all — a redundant, overlapping call to action
 * that pushed people toward checkout before they'd read the product value.
 * It now only appears once the hero's price row (#nfc-hero-price-row) has
 * actually scrolled out of view above the viewport.
 *
 * P0 QA finding: because the bar is position:fixed (it spans a hero panel
 * near the top of the DOM, so it can't use the "sticky, last child" trick),
 * it used to stay pinned over the FAQ and footer for the rest of the page
 * once shown — permanently covering footer links and the last FAQ rows.
 * It now also hides itself once #nfc-page-end-sentinel (placed right
 * before the footer) scrolls into view.
 */
export default function MobileBuyBar({
  price,
  product,
  variant,
  configuration,
  productName,
  unitPriceKurus,
  variantSku,
  label = "Sepete Ekle",
}: {
  price: string;
  product: CatalogProduct;
  variant?: ProductVariant;
  configuration?: Record<string, unknown>;
  productName: string;
  unitPriceKurus: number;
  variantSku?: string;
  label?: string;
}) {
  const [pastHero, setPastHero] = useState(false);
  const [nearPageEnd, setNearPageEnd] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById("nfc-hero-price-row");
    if (!anchor || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setPastHero(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sentinel = document.getElementById("nfc-page-end-sentinel");
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setNearPageEnd(entry.isIntersecting);
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const visible = pastHero && !nearPageEnd;

  return (
    <div
      className={`nfc-mobile-buybar${visible ? " nfc-mobile-buybar--visible" : ""}`}
      aria-label="Mobil hızlı satın alma"
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
    >
      <span><small>Kargo dahil</small><strong>{price}</strong></span>
      <AddToCartButton productId={product.slug} variantSku={variantSku ?? product.defaultOfferSku} kind="NFC_PHYSICAL_CARD" name={productName} unitPriceKurus={unitPriceKurus} configuration={configuration} label={label} />
    </div>
  );
}
