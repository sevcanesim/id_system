"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "../../components/AddToCartButton";
import { ProductVariantSelector } from "../../components/ui/ProductVariantSelector";
import type { CatalogProduct } from "../../../lib/config/product";
import { formatTryFromKurus } from "../../../lib/config/product";
import { Icon } from "../../icons";
import MobileBuyBar from "./MobileBuyBar";

export default function NfcPurchasePanel({ product }: { product: CatalogProduct }) {
  const variants = product.variants.filter((variant) => variant.active);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const unitPriceKurus = product.unitPriceKurus + (selectedVariant?.priceDeltaKurus ?? 0);
  const price = formatTryFromKurus(unitPriceKurus);
  const productName = selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name;
  const configuration = useMemo(
    () => selectedVariant
      ? { variantId: selectedVariant.id, variantName: selectedVariant.name }
      : undefined,
    [selectedVariant],
  );

  return (
    <>
      <div className="nfc-purchase-controls">
        <ProductVariantSelector
          label="Kart rengi"
          variants={variants}
          value={selectedVariant?.id ?? ""}
          onChange={setSelectedVariantId}
          renderPrice={(variant) => {
            const delta = variant.priceDeltaKurus ?? 0;
            return delta ? `${delta > 0 ? "+" : ""}${formatTryFromKurus(delta)}` : "Standart";
          }}
        />
      </div>

      <p className="nfc-account-note" role="note">
        Ödeme sırasında bilgilerini girersin. Hesabın varsa siparişin hesabına bağlanır; hesabın yoksa satın alma işlemini hesap açmadan tamamlayabilirsin.
      </p>

      <div className="nfc-price-row" id="nfc-hero-price-row">
        <div className="nfc-price-tag">
          <strong>{price}</strong>
          <small>kart + 1 yıllık kullanım</small>
        </div>
        <div className="nfc-price-actions">
          <AddToCartButton
            productId={product.slug}
            variantSku={product.defaultOfferSku}
            kind="NFC_PHYSICAL_CARD"
            name={productName}
            unitPriceKurus={unitPriceKurus}
            configuration={configuration}
            label="Sepete Ekle"
          />
        </div>
      </div>

      <div className="nfc-trust-row" aria-label="Güven ve güvenlik">
        <span><Icon name="lock" /> SSL güvenli ödeme</span>
        <span><Icon name="shield" /> iyzico güvencesi</span>
        <span><Icon name="truck" /> Türkiye içi ücretsiz kargo</span>
        <span><Icon name="refresh" /> Kolay iade</span>
      </div>

      <MobileBuyBar
        price={price}
        product={product}
        variant={selectedVariant}
        configuration={configuration}
        productName={productName}
        unitPriceKurus={unitPriceKurus}
      />
    </>
  );
}
