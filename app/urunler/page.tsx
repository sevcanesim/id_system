/**
 * Public chrome is provided by app/components/PublicSiteShell.
 * Do not mount SiteHeader/AnnouncementBar/AppFooter again on this route.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { ProductVisual } from "../ui/ProductVisual";
import AddToCartButton from "../components/AddToCartButton";
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

const commerceTrust = [
  ["shield", "iyzico ile güvenli ödeme"],
  ["clock", "1 yıl platform erişimi"],
  ["truck", "NFC ve Premium’da kargo dahil"],
  ["shield", "Kart bilgisi Yenomi’de tutulmaz"],
] as const;

export default async function ProductsPage() {
  return (
    <div className="products-commerce-v3 yi-site">
      <main id="main-content">
        <section className="products-commerce-v3__hero" aria-labelledby="products-hero-title">
          <div className="yi-container products-commerce-v3__hero-grid">
            <div className="products-commerce-v3__hero-copy">
              <span className="products-commerce-v3__eyebrow">YENOMI ID · NFC DİJİTAL KARTVİZİT</span>
              <h1 id="products-hero-title">Tek kart.<br />Değişmeyen bağlantın.</h1>
              <p>
                Kartın bir kez basılır. İsim, unvan, telefon veya bağlantıların değiştiğinde kartı değil,
                dijital profilini güncellersin.
              </p>
              <div className="products-commerce-v3__hero-price">
                <span>NFC + dijital profil</span>
                <strong>{formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus)}</strong>
              </div>
              <div className="products-commerce-v3__hero-actions">
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_SKUS.INITIAL}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID NFC Kart"
                  unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus}
                  label="NFC Kartımı Al"
                />
                <a href="#planlar" className="products-commerce-v3__text-link">Planları karşılaştır <span aria-hidden="true">→</span></a>
              </div>
              <div className="products-commerce-v3__hero-trust" aria-label="Satın alma güvenceleri">
                <span>Hesap açmadan ödeme</span>
                <span>2 iş gününde hazırlık</span>
                <span>Türkiye içi ücretsiz kargo</span>
              </div>
            </div>

            <div className="products-commerce-v3__stage" aria-label="Yenomi ID NFC kart ve dijital profil önizlemesi">
              <div className="products-commerce-v3__stage-glow" aria-hidden="true" />
              <ProductVisual pair />
              <div className="products-commerce-v3__stage-caption">
                <span>NFC + QR</span>
                <strong>Tek profil. Her zaman güncel.</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="planlar" className="products-commerce-v3__plans" aria-labelledby="plans-title">
          <div className="yi-container">
            <header className="products-commerce-v3__section-head">
              <div>
                <span className="products-commerce-v3__eyebrow">PLANINI SEÇ</span>
                <h2 id="plans-title">İhtiyacına göre başla.</h2>
              </div>
              <p>Üç planın temelinde aynı canlı dijital profil var. Fark; fiziksel kart ve networking araçlarının kapsamı.</p>
            </header>

            <div className="products-commerce-v3__plan-grid">
              <article className="products-commerce-v3__plan-card">
                <div className="products-commerce-v3__plan-topline">
                  <span>DİJİTAL</span>
                  <strong>{formatTryFromKurus(INDIVIDUAL_DIGITAL_PLAN.priceKurus)}</strong>
                </div>
                <h3>{INDIVIDUAL_DIGITAL_PLAN.name}</h3>
                <p className="products-commerce-v3__plan-summary">Fiziksel kart istemeyenler için canlı dijital kartvizit.</p>
                <ul>
                  {INDIVIDUAL_DIGITAL_CATALOG_POINTS.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}
                </ul>
                <div className="products-commerce-v3__plan-action">
                  <AddToCartButton
                    productId={NFC_PRODUCT.slug}
                    variantSku={COMMERCIAL_SKUS.DIGITAL}
                    kind="NFC_PHYSICAL_CARD"
                    name="Yenomi ID Dijital Kartvizit"
                    unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_DIGITAL.priceKurus}
                    label="Dijital ile Başla"
                    appearance="secondary"
                  />
                </div>
              </article>

              <article className="products-commerce-v3__plan-card products-commerce-v3__plan-card--featured">
                <div className="products-commerce-v3__featured-badge">EN ÇOK TERCİH EDİLEN</div>
                <div className="products-commerce-v3__plan-topline">
                  <span>NFC</span>
                  <strong>{formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus)}</strong>
                </div>
                <h3>{INDIVIDUAL_PLAN.name}</h3>
                <p className="products-commerce-v3__plan-summary">Fiziksel NFC + QR kart ve canlı dijital profil tek pakette.</p>
                <ul>
                  {INDIVIDUAL_CATALOG_POINTS.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}
                </ul>
                <div className="products-commerce-v3__plan-action">
                  <AddToCartButton
                    productId={NFC_PRODUCT.slug}
                    variantSku={COMMERCIAL_SKUS.INITIAL}
                    kind="NFC_PHYSICAL_CARD"
                    name="Yenomi ID NFC Kart"
                    unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus}
                    label="NFC Kartımı Al"
                  />
                </div>
              </article>

              <article className="products-commerce-v3__plan-card products-commerce-v3__plan-card--dark">
                <div className="products-commerce-v3__plan-topline">
                  <span>PREMIUM</span>
                  <strong>{formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus)}</strong>
                </div>
                <h3>{INDIVIDUAL_PREMIUM_PLAN.name}</h3>
                <p className="products-commerce-v3__plan-summary">NFC paketine toplantı, sunum, kişi yönetimi ve Network Mail ekleyin.</p>
                <ul>
                  {INDIVIDUAL_PREMIUM_CATALOG_POINTS.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}
                </ul>
                <div className="products-commerce-v3__plan-action">
                  <AddToCartButton
                    productId={NFC_PRODUCT.slug}
                    variantSku={COMMERCIAL_SKUS.PREMIUM}
                    kind="NFC_PHYSICAL_CARD"
                    name="Yenomi ID Premium — NFC + 500 Network Mail"
                    unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus}
                    label="Premium’u Seç"
                    appearance="secondary"
                  />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="products-commerce-v3__existing" aria-labelledby="existing-title">
          <div className="yi-container products-commerce-v3__existing-inner">
            <div>
              <span className="products-commerce-v3__eyebrow">ZATEN YENOMI KULLANIYOR MUSUN?</span>
              <h2 id="existing-title">Aynı profile ikinci NFC kartını ekle.</h2>
              <p>Yeni dijital kimlik veya yeni kullanım yılı açmaz. Mevcut aktif profilinize bağlı ek NFC + QR karttır.</p>
              <div className="products-commerce-v3__existing-features">
                {ADDITIONAL_CARD_FEATURES.slice(0, 3).map((item) => <span key={item}><Icon name="check" />{item}</span>)}
              </div>
            </div>
            <div className="products-commerce-v3__existing-buy">
              <strong>{formatTryFromKurus(ADDITIONAL_CARD_PLAN.priceKurus)}</strong>
              <AddToCartButton
                productId={NFC_PRODUCT.slug}
                variantSku={COMMERCIAL_SKUS.ADDITIONAL_CARD}
                kind="NFC_PHYSICAL_CARD"
                name="Yenomi ID Yedek Kart"
                unitPriceKurus={COMMERCIAL_PRICING.ADDITIONAL_CARD.priceKurus}
                label="Yedek Kart Ekle"
                appearance="secondary"
              />
            </div>
          </div>
        </section>

        <section className="products-commerce-v3__trust-strip" aria-label="Yenomi ID satın alma bilgileri">
          <div className="yi-container">
            {commerceTrust.map(([icon, label]) => <span key={label}><Icon name={icon} />{label}</span>)}
          </div>
        </section>

        <section className="products-commerce-v3__corporate" aria-labelledby="corporate-title">
          <div className="yi-container products-commerce-v3__corporate-inner">
            <div>
              <span className="products-commerce-v3__eyebrow">EKİBİN İÇİN</span>
              <h2 id="corporate-title">50 kart değil.<br />Tek bir marka sistemi.</h2>
              <p>Çalışan kartlarını, şablonları, lisansları ve erişimleri tek merkezden yönetin.</p>
            </div>
            <Link href="/kurumsal" className="products-commerce-v3__corporate-link">Kurumsal Yenomi <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
    </div>
  );
}
