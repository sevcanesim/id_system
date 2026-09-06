"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "../../components/AddToCartButton";
import { ProductVariantSelector } from "../../components/ui/ProductVariantSelector";
import type { CatalogProduct } from "../../../lib/config/product";
import { formatTryFromKurus } from "../../../lib/config/product";
import { COMMERCIAL_FULFILLMENT, COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "../../../lib/config/commercial";
import { INDIVIDUAL_PLAN, INDIVIDUAL_PREMIUM_PLAN } from "../../../lib/commerce/packages";
import { Icon } from "../../icons";
import MobileBuyBar from "./MobileBuyBar";
import { useNfcPackage } from "./NfcPackageContext";

export default function NfcPurchasePanel({
  product,
  accessRequired = false,
}: {
  product: CatalogProduct;
  accessRequired?: boolean;
}) {
  const variants = product.variants.filter((variant) => variant.active);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const { packageId, setPackageId } = useNfcPackage();
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  // `product` represents the Premium listing, so its defaults must never be
  // reused for the individually selected NFC package.
  const offerSku = packageId === "premium" ? COMMERCIAL_SKUS.PREMIUM : COMMERCIAL_SKUS.INITIAL;
  const offerPriceKurus = packageId === "premium"
    ? COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus
    : COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus;
  const unitPriceKurus = offerPriceKurus + (selectedVariant?.priceDeltaKurus ?? 0);
  const price = formatTryFromKurus(unitPriceKurus);
  const packageName = packageId === "premium" ? "Yenomi ID Bireysel Premium" : "Yenomi ID Bireysel NFC";
  const productName = selectedVariant
    ? `${packageName} — ${selectedVariant.name}`
    : packageName;
  const ctaLabel = packageId === "premium" ? "Premium deneyimi seç →" : "Sade kartımı seç →";
  const configuration = useMemo(
    () => selectedVariant
      ? { variantId: selectedVariant.id, variantName: selectedVariant.name, packageCode: packageId === "premium" ? INDIVIDUAL_PREMIUM_PLAN.code : INDIVIDUAL_PLAN.code }
      : undefined,
    [selectedVariant, packageId],
  );

  return (
    <>
      <div className="nfc-purchase-controls">
        <ProductVariantSelector
          name="product-package"
          label="Paket"
          variants={[
            { id: "individual", name: "Bireysel NFC" },
            { id: "premium", name: "Bireysel Premium" },
          ]}
          value={packageId}
          onChange={(value) => setPackageId(value === "premium" ? "premium" : "individual")}
          renderPrice={(variant) => formatTryFromKurus(
            variant.id === "premium"
              ? COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus
              : COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus,
          )}
        />
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

      <p className="nfc-account-note" role={accessRequired ? "status" : "note"}>
        {accessRequired
          ? "Yedek veya replacement kart için aktif bir Yenomi ID hizmetin gerekir. Aşağıdan ilk kartını alabilirsin; ödeme sunucuda yeniden doğrulanır."
          : packageId === "premium"
            ? "Bireysel Premium: NFC kart, 1 yıl platform erişimi ve 100 Network Mail. Kart bilgilerin yalnızca PayTR’ın güvenli sayfasında işlenir."
            : "Bireysel NFC: tek seferlik ödeme ve 1 yıl platform erişimi dahil. Kart bilgilerin yalnızca PayTR’ın güvenli sayfasında işlenir; Yenomi sunucularında saklanmaz."}
      </p>

      <div className="nfc-price-row" id="nfc-hero-price-row">
        <div className="nfc-price-tag">
          <strong>{price}</strong>
          <small>{packageId === "premium" ? "Bireysel Premium · NFC + 1 yıl + 100 Network Mail" : "Bireysel NFC · NFC + 1 yıl dahil"}</small>
        </div>
        <div className="nfc-price-actions">
          <AddToCartButton
            productId={product.slug}
            variantSku={offerSku}
            kind="NFC_PHYSICAL_CARD"
            name={productName}
            unitPriceKurus={unitPriceKurus}
            configuration={configuration}
            label={ctaLabel}
          />
        </div>
      </div>

      <div className="nfc-trust-row" aria-label="Güven ve güvenlik">
        <span><Icon name="lock" /> Ödeme bilgilerin PayTR’da işlenir</span>
        <span><Icon name="shield" /> Kart numaran Yenomi’de tutulmaz</span>
        <span><Icon name="truck" /> {COMMERCIAL_FULFILLMENT.domesticShipping}</span>
        <span><Icon name="clock" /> {COMMERCIAL_FULFILLMENT.handover}</span>
        <span><Icon name="headset" /> {COMMERCIAL_FULFILLMENT.supportResponse}</span>
      </div>

      <MobileBuyBar
        price={price}
        product={product}
        configuration={configuration}
        productName={productName}
        unitPriceKurus={unitPriceKurus}
        variantSku={offerSku}
        label={ctaLabel}
      />
    </>
  );
}
