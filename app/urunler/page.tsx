/**
 * Public chrome is provided by app/components/PublicSiteShell.
 * Do not mount SiteHeader/AnnouncementBar/AppFooter again on this route.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ProductVisual } from "../ui/ProductVisual";
import AddToCartButton from "../components/AddToCartButton";
import { PublicPageTitle } from "../components/PublicPageTitle";
import { Icon } from "../icons";
import {
  ADDITIONAL_CARD_FEATURES,
  ADDITIONAL_CARD_PLAN,
  INDIVIDUAL_CATALOG_POINTS,
  INDIVIDUAL_DIGITAL_CATALOG_POINTS,
  INDIVIDUAL_DIGITAL_PLAN,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_CATALOG_POINTS,
  INDIVIDUAL_PREMIUM_PLAN,
} from "../../lib/commerce/packages";
import { COMMERCIAL_PRICING, COMMERCIAL_SKUS } from "../../lib/config/commercial";
import { formatTryFromKurus, NFC_PRODUCT } from "../../lib/config/product";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Dijital Kartvizit",
  description: "Dijital kartvizit, NFC kart veya Premium. Tek seferlik ödeme, 1 yıl platform üyeliği dahil.",
};

export default async function ProductsPage() {
  return (
    <div className="products-single-page yi-site">
      <main id="main-content" className="products-single-main">
        <PublicPageTitle
          kicker="YENOMI ID · DİJİTAL KARTVİZİT"
          title={<>Kartın sende kalsın.<br />Profilin her an güncel.</>}
          description="Dijitalini dene, NFC kartını al, Premium ile networking’i aç. Tek seferlik ödeme; 1 yıl platform üyeliği dahil."
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
                <span className="products-single-kicker">DİJİTAL</span>
                <h2>{INDIVIDUAL_DIGITAL_PLAN.name}</h2>
                <strong className="products-single-price">{formatTryFromKurus(INDIVIDUAL_DIGITAL_PLAN.priceKurus)}</strong>
              </div>
              <p>Fiziksel kart yok. Dijital kartını oluştur, ürünü kullan. Tek seferlik ödeme, 1 yıl dahil.</p>
              <ul aria-label="Dijital paket içeriği">
                {INDIVIDUAL_DIGITAL_CATALOG_POINTS.map((item) => (
                  <li key={item}><Icon name="check" /><span>{item}</span></li>
                ))}
              </ul>
              <div className="products-plan-card__cta">
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_SKUS.DIGITAL}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID Dijital Kartvizit"
                  unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_DIGITAL.priceKurus}
                  label="Dijital Kartımı Oluştur"
                  appearance="secondary"
                />
              </div>
            </article>
            <article className="products-plan-card is-popular">
              <div className="products-plan-card__head">
                <span className="products-single-kicker">NFC</span>
                <h2 id="offer-title">{INDIVIDUAL_PLAN.name} <span className="products-plan-badge">Ana ürün</span></h2>
                <strong className="products-single-price">{formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus)}</strong>
              </div>
              <p>1 NFC kart + dijital profil + QR + görüntülenme. Tek seferlik ödeme, 1 yıl dahil, kargo Türkiye içi ücretsiz.</p>
              <ul aria-label="NFC paket içeriği">
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
                  unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus}
                  label="NFC Kartımı Al →"
                />
              </div>
            </article>
            <article className="products-plan-card">
              <div className="products-plan-card__head">
                <span className="products-single-kicker">PREMIUM</span>
                <h2>{INDIVIDUAL_PREMIUM_PLAN.name}</h2>
                <strong className="products-single-price">{formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus)}</strong>
              </div>
              <p>NFC paketteki her şey, artı toplantı, sunum, kişi yönetimi ve 500 Network Mail. Kredi ödeme sonrası yazılır.</p>
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
                  name="Yenomi ID Premium — NFC + 500 Network Mail"
                  unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus}
                  label="Premium’u Seç →"
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
            <span>Tek seferlik ödeme</span>
            <span>1 yıl platform üyeliği dahil</span>
            <span>NFC ve Premium’da kargo dahil</span>
            <span>Kartın iyzico’da kalır</span>
          </div>
        </section>

        <section className="products-plg-corporate" aria-labelledby="plg-corporate-title">
          <div className="yi-container">
            <span className="products-single-kicker">KURUMSAL</span>
            <h2 id="plg-corporate-title">Ekibiniz için de Yenomi kullanın.</h2>
            <p>Çalışanlarınızın dijital kartlarını tek panelden yönetin.</p>
            <Link className="home-mockup__link-secondary" href="/kurumsal">
              Kurumsal Çözümleri İncele <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
