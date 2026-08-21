/**
 * Public chrome is provided by app/components/PublicSiteShell.
 * Do not mount SiteHeader/AnnouncementBar/AppFooter again on this route.
 */

import type { Metadata } from "next";
import { getDatabaseCatalog } from "../../lib/config/database";
import { formatTryFromKurus, listingPriceKurus, NFC_PRODUCT } from "../../lib/config/product";
import { ProductVisual } from "../ui/ProductVisual";
import AddToCartButton from "../components/AddToCartButton";
import { PublicPageTitle } from "../components/PublicPageTitle";
import { Icon } from "../icons";
import {
  ADDITIONAL_CARD_FEATURES,
  ADDITIONAL_CARD_PLAN,
  INDIVIDUAL_CATALOG_POINTS,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_CATALOG_POINTS,
  INDIVIDUAL_PREMIUM_PLAN,
} from "../../lib/commerce/packages";
import { COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "../../lib/config/commercial";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dijital Kartvizit",
  description: "NFC + QR dijital kartvizit. Unvanın değişince kartı yeniden bastırma. Bireysel, Premium ve yedek kart seçenekleri.",
};

export default async function ProductsPage() {
  let listPriceKurus: number = INDIVIDUAL_PLAN.priceKurus;
  try {
    const products = await getDatabaseCatalog();
    const available = products.filter((p) => String(p.status).toUpperCase() !== "COMING_SOON");
    const nfc = available.find((p) => p.slug === "nfc-kart") ?? available[0];
    listPriceKurus = listingPriceKurus(nfc?.variants);
  } catch {
    listPriceKurus = INDIVIDUAL_PLAN.priceKurus;
  }

  return (
    <div className="products-single-page yi-site">
      <main id="main-content" className="products-single-main">
        <PublicPageTitle
          kicker="YENOMI ID · DİJİTAL KARTVİZİT"
          title={<>Kartın sende kalsın.<br />Profilin her an güncel.</>}
          description="NFC + QR kartın sende kalır. Unvanın değişince baskı yok; canlı profil her tanışmada güncel açılır."
          className="public-page-title--catalog"
        />
        <section className="products-single-hero" aria-label="Yenomi ID NFC kart önizlemesi">
          <div className="yi-container products-single-hero__inner">
            <div className="products-single-visual">
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
                <strong className="products-single-price">{formatTryFromKurus(listPriceKurus)}</strong>
              </div>
              <p>NFC kart + 1 yıllık dijital kartvizit + Türkiye içi ücretsiz kargo.</p>
              <ul aria-label="Bireysel paket içeriği">
                {INDIVIDUAL_CATALOG_POINTS.map((item) => (
                  <li key={item}><Icon name="check" /><span>{item}</span></li>
                ))}
              </ul>
              <div className="products-plan-card__cta">
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_SKUS.INITIAL}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID NFC Kart"
                  unitPriceKurus={listPriceKurus}
                  label="Sepete Ekle"
                />
              </div>
            </article>
            <article className="products-plan-card is-popular">
              <div className="products-plan-card__head">
                <span className="products-single-kicker">BİREYSEL PREMIUM</span>
                <h2>{INDIVIDUAL_PREMIUM_PLAN.name} <span className="products-plan-badge">En çok tercih edilen</span></h2>
                <strong className="products-single-price">{formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus)}</strong>
              </div>
              <p>Bireysel paketteki her şey, artı toplantı, sunum, kişi yönetimi ve 100 Network Mail. Kredi ödeme sonrası yazılır.</p>
              <ul aria-label="Premium paket içeriği">
                {INDIVIDUAL_PREMIUM_CATALOG_POINTS.map((item) => (
                  <li key={item}><Icon name="check" /><span>{item}</span></li>
                ))}
              </ul>
              <div className="products-plan-card__cta">
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_SKUS.PREMIUM}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID Bireysel Premium — NFC + 100 Network Mail"
                  unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus}
                  label="Sepete Ekle"
                  appearance="secondary"
                />
              </div>
            </article>
            <article className="products-plan-card">
              <div className="products-plan-card__head">
                <span className="products-single-kicker">YEDEK KART</span>
                <h2>{ADDITIONAL_CARD_PLAN.name}</h2>
                <strong className="products-single-price">{formatTryFromKurus(ADDITIONAL_CARD_PLAN.priceKurus)}</strong>
              </div>
              <p>Aynı dijital profile bağlı ek NFC + QR kart. Yeni yıl veya yeni profil açmaz. Aktif hizmet gerekir.</p>
              <ul aria-label="Yedek kart içeriği">
                {ADDITIONAL_CARD_FEATURES.map((item) => (
                  <li key={item}><Icon name="check" /><span>{item}</span></li>
                ))}
              </ul>
              <div className="products-plan-card__cta">
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_SKUS.ADDITIONAL_CARD}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID Yedek Kart"
                  unitPriceKurus={COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus}
                  label="Sepete Ekle"
                  appearance="secondary"
                />
              </div>
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
      </main>
    </div>
  );
}
