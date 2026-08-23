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

const planTrust = [
  "Tek seferlik ödeme",
  "1 yıl platform erişimi",
  "Kart bilgisi Yenomi’de tutulmaz",
];

export default async function ProductsPage() {
  return (
    <div className="products-single-page products-premium-v2 yi-site">
      <main id="main-content" className="products-single-main">
        <PublicPageTitle
          kicker="YENOMI ID · DİJİTAL KARTVİZİT"
          title={<>Kart aynı kalır.<br />Bilgilerin değişebilir.</>}
          description="Dijital profil ile başlayın, NFC ile tek dokunuşta paylaşın, Premium ile networking araçlarını açın. Üç net seçenek; 1 yıl platform erişimi dahil."
          className="public-page-title--catalog products-premium-v2__title"
        />

        <section className="products-single-hero products-premium-v2__hero" aria-label="Yenomi ID NFC kart önizlemesi">
          <div className="yi-container products-single-hero__inner products-premium-v2__hero-inner">
            <div className="products-single-visual products-premium-v2__visual">
              <ProductVisual pair />
            </div>
            <div className="products-premium-v2__hero-note">
              <span>NFC + QR</span>
              <strong>Bir kart. Tek profil. Her zaman güncel.</strong>
              <p>Karşı taraf uygulama indirmez. Kartı yaklaştırır veya QR’ı okutur; profil tarayıcıda açılır.</p>
            </div>
          </div>
        </section>

        <section className="products-single-offer products-premium-v2__offer" aria-labelledby="offer-title">
          <div className="yi-container">
            <div className="products-premium-v2__decision-head">
              <div>
                <span className="products-single-kicker">PLANINIZI SEÇİN</span>
                <h2 id="offer-title">İhtiyacınız kadar başlayın.</h2>
                <p>Üç planın temel kimliği aynı. Fark, fiziksel NFC kart ve networking araçlarının kapsamı.</p>
              </div>
              <div className="products-premium-v2__trust" aria-label="Satın alma güvenceleri">
                {planTrust.map((item) => <span key={item}><Icon name="check" />{item}</span>)}
              </div>
            </div>

            <div className="products-plan-grid products-premium-v2__plan-grid">
              <article className="products-plan-card products-premium-v2__plan-card">
                <div className="products-plan-card__head">
                  <span className="products-single-kicker">DİJİTAL</span>
                  <h3>{INDIVIDUAL_DIGITAL_PLAN.name}</h3>
                  <strong className="products-single-price">{formatTryFromKurus(INDIVIDUAL_DIGITAL_PLAN.priceKurus)}</strong>
                  <span className="products-premium-v2__price-note">1 yıl kullanım dahil</span>
                </div>
                <p className="products-premium-v2__plan-lead">Fiziksel kart istemeyenler için. Dijital kartvizitinizi oluşturun ve QR ile paylaşmaya başlayın.</p>
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
                    label="Dijital ile Başla"
                    appearance="secondary"
                  />
                </div>
              </article>

              <article className="products-plan-card products-premium-v2__plan-card products-premium-v2__plan-card--featured is-popular">
                <div className="products-premium-v2__featured-label">En dengeli seçim</div>
                <div className="products-plan-card__head">
                  <span className="products-single-kicker">NFC</span>
                  <h3>{INDIVIDUAL_PLAN.name}</h3>
                  <strong className="products-single-price">{formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus)}</strong>
                  <span className="products-premium-v2__price-note">1 NFC kart + 1 yıl kullanım</span>
                </div>
                <p className="products-premium-v2__plan-lead">Dijital profiliniz cebinizdeki tek fiziksel kartla buluşur. Yaklaştırın; profiliniz anında açılsın.</p>
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
                    label="NFC Kartımı Seç"
                  />
                </div>
              </article>

              <article className="products-plan-card products-premium-v2__plan-card products-premium-v2__plan-card--premium">
                <div className="products-plan-card__head">
                  <span className="products-single-kicker">PREMIUM</span>
                  <h3>{INDIVIDUAL_PREMIUM_PLAN.name}</h3>
                  <strong className="products-single-price">{formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus)}</strong>
                  <span className="products-premium-v2__price-note">NFC + networking araçları</span>
                </div>
                <p className="products-premium-v2__plan-lead">NFC paketindeki her şey; ayrıca toplantı, sunum, kişi yönetimi ve 500 Network Mail kredisi.</p>
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
                    label="Premium’u Seç"
                    appearance="secondary"
                  />
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="products-premium-v2__existing" aria-labelledby="existing-customer-title">
          <div className="yi-container products-premium-v2__existing-card">
            <div className="products-premium-v2__existing-copy">
              <span className="products-single-kicker">MEVCUT YENOMI ID KULLANICISI</span>
              <h2 id="existing-customer-title">Aynı profile ikinci kart ekleyin.</h2>
              <p>Yedek Kart yeni bir dijital kimlik veya yeni kullanım yılı açmaz. Mevcut aktif profilinize bağlı ikinci NFC + QR karttır.</p>
              <div className="products-premium-v2__existing-features">
                {ADDITIONAL_CARD_FEATURES.slice(0, 3).map((item) => <span key={item}><Icon name="check" />{item}</span>)}
              </div>
            </div>
            <div className="products-premium-v2__existing-buy">
              <span>{ADDITIONAL_CARD_PLAN.name}</span>
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

        <section className="products-single-proof products-premium-v2__proof" aria-label="Yenomi ID satın alma bilgileri">
          <div className="yi-container products-single-proof__grid">
            <span><Icon name="shield" />iyzico ödeme altyapısı</span>
            <span><Icon name="clock" />1 yıl platform erişimi</span>
            <span><Icon name="truck" />NFC ve Premium’da kargo dahil</span>
            <span><Icon name="shield" />Kart bilgisi Yenomi’de tutulmaz</span>
          </div>
        </section>

        <section className="products-plg-corporate products-premium-v2__corporate" aria-labelledby="plg-corporate-title">
          <div className="yi-container">
            <span className="products-single-kicker">EKİBİNİZ İÇİN</span>
            <h2 id="plg-corporate-title">Aynı standardı tüm ekibe taşıyın.</h2>
            <p>Çalışan kartları, marka kontrolü ve yetkiler tek panelde yönetilsin.</p>
            <Link className="home-mockup__link-secondary" href="/kurumsal">
              Kurumsal Paketleri İncele <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
