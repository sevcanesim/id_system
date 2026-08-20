"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "../../components/AddToCartButton";
import { ProductVariantSelector } from "../../components/ui/ProductVariantSelector";
import type { CatalogProduct } from "../../../lib/config/product";
import { formatTryFromKurus } from "../../../lib/config/product";
import { COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "../../../lib/config/commercial";
import { INDIVIDUAL_PLAN, INDIVIDUAL_PREMIUM_PLAN } from "../../../lib/commerce/packages";
import { Icon } from "../../icons";
import MobileBuyBar from "./MobileBuyBar";

export default function NfcPurchasePanel({
  product,
  initialPackage = "individual",
  accessRequired = false,
}: {
  product: CatalogProduct;
  initialPackage?: "individual" | "premium";
  accessRequired?: boolean;
}) {
  const variants = product.variants.filter((variant) => variant.active);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const [packageId, setPackageId] = useState<"individual" | "premium">(initialPackage);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0];
  const offerSku = packageId === "premium" ? COMMERCIAL_SKUS.PREMIUM : product.defaultOfferSku;
  const offerPriceKurus = packageId === "premium"
    ? COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus
    : product.unitPriceKurus;
  const unitPriceKurus = offerPriceKurus + (selectedVariant?.priceDeltaKurus ?? 0);
  const price = formatTryFromKurus(unitPriceKurus);
  const productName = selectedVariant
    ? `${packageId === "premium" ? "Yenomi ID Bireysel Premium" : product.name} — ${selectedVariant.name}`
    : packageId === "premium" ? "Yenomi ID Bireysel Premium" : product.name;
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
            { id: "individual", name: INDIVIDUAL_PLAN.name },
            { id: "premium", name: INDIVIDUAL_PREMIUM_PLAN.name },
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
            ? "Premium: NFC kart + 1 yıl + 100 Network Mail. Kredi ödeme sonrası hesabına yazılır. Kart numarası iyzico’da kalır."
            : "Hesabın varsa sipariş bağlanır. Yoksa hesap açmadan ödeyebilirsin. Kart numarası Yenomi sunucularında tutulmaz."}
      </p>

      <div className="nfc-price-row" id="nfc-hero-price-row">
        <div className="nfc-price-tag">
          <strong>{price}</strong>
          <small>{packageId === "premium" ? "kart + 1 yıl + 100 Network Mail" : "kart + 1 yıllık kullanım"}</small>
        </div>
        <div className="nfc-price-actions">
          <AddToCartButton
            productId={product.slug}
            variantSku={offerSku}
            kind="NFC_PHYSICAL_CARD"
            name={productName}
            unitPriceKurus={unitPriceKurus}
            configuration={configuration}
            label="Sepete Ekle"
          />
        </div>
      </div>

      <div className="nfc-trust-row" aria-label="Güven ve güvenlik">
        <span><Icon name="lock" /> SSL şifreli ödeme</span>
        <span><Icon name="shield" /> Kartın iyzico’da kalır</span>
        <span><Icon name="truck" /> Türkiye içi kargo dahil</span>
        <span><Icon name="refresh" /> 14 gün cayma hakkı</span>
      </div>

      <MobileBuyBar
        price={price}
        product={product}
        variant={selectedVariant}
        configuration={configuration}
        productName={productName}
        unitPriceKurus={unitPriceKurus}
        variantSku={offerSku}
      />
    </>
  );
}
