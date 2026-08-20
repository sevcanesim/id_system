/**
 * Public chrome is provided by app/components/PublicSiteShell.
 * Do not mount SiteHeader/AnnouncementBar/AppFooter again on this route.
 */

import type { Metadata } from "next";
import { getDatabaseCatalog } from "../../lib/config/database";
import { formatTryFromKurus, listingPriceKurus, NFC_PRODUCT } from "../../lib/config/product";
import { ProductVisual } from "../ui/ProductVisual";
import { ButtonLink } from "../ui/Button";
import AddToCartButton from "../components/AddToCartButton";
import { PublicPageTitle } from "../components/PublicPageTitle";
import {
  INDIVIDUAL_FEATURES,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_FEATURES,
  INDIVIDUAL_PREMIUM_PLAN,
} from "../../lib/commerce/packages";
import { COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "../../lib/config/commercial";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dijital Kartvizit",
  description: "799 TL bireysel NFC + QR kart. Premium 1.250 TL. Unvanın değişince baskı yok. Ekip için kurumsal paketler ayrı.",
};

export default async function ProductsPage() {
  let products: Awaited<ReturnType<typeof getDatabaseCatalog>> = [];
  let catalogError = false;
  try { products = await getDatabaseCatalog(); } catch { catalogError = true; }

  const available = products.filter((p) => String(p.status).toUpperCase() !== "COMING_SOON");
  const nfc = available.find((p) => p.slug === "nfc-kart") ?? available[0];
  const listPriceKurus = listingPriceKurus(nfc?.variants);

  return (
    <div className="products-single-page yi-site">
      <main id="main-content" className="products-single-main">
        <PublicPageTitle
          kicker="YENOMI ID · DİJİTAL KARTVİZİT"
          title={<>Kartın sende kalsın.<br /><em>Profilin her an güncel.</em></>}
          description="799 TL bireysel NFC + QR. Premium 1.250 TL ile toplantı, sunum ve 100 Network Mail. Ekip için 100 kişiye kadar sepete ekle."
          className="public-page-title--catalog"
        />
        <section className="products-single-hero" aria-labelledby="products-title">
          <div className="yi-container products-single-hero__inner">
            <div className="products-single-copy">
              <span className="yi-hero__eyebrow">KARTINI SEÇ</span>
              <h2 id="products-title">Tek kart. Her tanışmada güncel.</h2>
              <p>NFC + QR kartını al, canlı profilini bağla. Unvanın değişince baskı yok. Ekip aynı standartta tanışacaksa kurumsal paketi seç.</p>
              <div className="products-single-actions">
                {nfc && <ButtonLink href={`/urunler/${nfc.slug}`} variant="dark">NFC Kartı Satın Al</ButtonLink>}
                <ButtonLink href="/kurumsal" variant="secondary">Ekip paketini incele</ButtonLink>
              </div>
            </div>
            <div className="products-single-visual" aria-label="Yenomi ID NFC kart önizlemesi">
              <ProductVisual pair />
            </div>
          </div>
        </section>

        <section className="products-single-offer" aria-labelledby="offer-title">
          <div className="yi-container products-plan-grid">
            <article className="products-plan-card">
              <div className="products-plan-card__head">
                <span className="products-single-kicker">BİREYSEL</span>
                <h2 id="offer-title">{INDIVIDUAL_PLAN.name}</h2>
                {!catalogError && <strong className="products-single-price">{formatTryFromKurus(listPriceKurus)}</strong>}
              </div>
              <p>NFC kart + 1 yıllık dijital kartvizit + Türkiye içi ücretsiz kargo.</p>
              <ul aria-label="Bireysel paket içeriği">
                {INDIVIDUAL_FEATURES.map((item) => <li key={item}>{item}</li>)}
              </ul>
              {nfc && !catalogError && (
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_SKUS.INITIAL}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID NFC Kart"
                  unitPriceKurus={listPriceKurus}
                  label="Sepete Ekle"
                />
              )}
            </article>
            <article className="products-plan-card is-popular">
              <div className="products-plan-card__head">
                <span className="products-single-kicker">BİREYSEL PREMIUM</span>
                <h2>{INDIVIDUAL_PREMIUM_PLAN.name} <span className="products-plan-badge">En çok tercih edilen</span></h2>
                <strong className="products-single-price">{formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus)}</strong>
              </div>
              <p>Bireysel paketteki her şey, artı toplantı, sunum, kişi yönetimi ve 100 Network Mail. Kredi ödeme sonrası yazılır.</p>
              <ul aria-label="Premium paket içeriği">
                {INDIVIDUAL_PREMIUM_FEATURES.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <AddToCartButton
                productId={NFC_PRODUCT.slug}
                variantSku={COMMERCIAL_SKUS.PREMIUM}
                kind="NFC_PHYSICAL_CARD"
                name="Yenomi ID Bireysel Premium — NFC + 100 Network Mail"
                unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus}
                label="Sepete Ekle"
              />
            </article>
          </div>
        </section>

        <section className="products-single-proof" aria-label="Yenomi ID satın alma bilgileri">
          <div className="yi-container products-single-proof__grid">
            <span>Türkiye içi kargo dahil</span>
            <span>2 iş günü hazırlık</span>
            <span>1 yıl dijital hizmet dahil</span>
            <span>Kartın iyzico’da kalır</span>
          </div>
        </section>

        {catalogError && <p className="products-single-error" role="status">Ürün fiyatı şu anda görüntülenemiyor. Lütfen kısa süre sonra tekrar deneyin.</p>}
        {!catalogError && !nfc && <p className="products-single-error" role="status">Şu anda listelenecek aktif bir kart paketi yok.</p>}
      </main>
    </div>
  );
}
