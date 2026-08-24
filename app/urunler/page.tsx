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
  title: "Yenomi ID — NFC Dijital Kartvizit",
  description: "Yenomi ID ile NFC + QR kartınızı tek bir canlı dijital profile bağlayın. 1 yıl platform erişimi ve Türkiye içi kargo dahil.",
};

const commerceTrust = [
  ["shield", "iyzico ile güvenli ödeme"],
  ["clock", "1 yıl platform erişimi"],
  ["truck", "Türkiye içi kargo dahil"],
] as const;

export default async function ProductsPage() {
  return (
    <div className="products-commerce-v3 products-commerce-v4 yi-site">
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
                <span>Yenomi ID · NFC + QR + dijital profil</span>
                <strong>{formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus)}</strong>
              </div>
              <div className="products-commerce-v3__hero-actions">
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_SKUS.INITIAL}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID NFC Kart"
                  unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus}
                  label="Yenomi ID’mi Al"
                />
                <a href="#nasil-calisir" className="products-commerce-v3__text-link">Nasıl çalışır? <span aria-hidden="true">→</span></a>
              </div>
              <div className="products-commerce-v3__hero-trust" aria-label="Satın alma güvenceleri">
                <span>Hesap açmadan ödeme</span>
                <span>2 iş gününde hazırlık</span>
                <span>Ücretsiz kargo</span>
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

        <section id="nasil-calisir" className="products-commerce-v4__how" aria-labelledby="how-title">
          <div className="yi-container">
            <header className="products-commerce-v4__how-head">
              <span className="products-commerce-v3__eyebrow">NASIL ÇALIŞIR?</span>
              <h2 id="how-title">Üç adım. Uygulama gerekmez.</h2>
            </header>
            <div className="products-commerce-v4__steps">
              <article><span>01</span><strong>Yaklaştır</strong><p>NFC kartını telefona yaklaştır veya QR kodu okut.</p></article>
              <article><span>02</span><strong>Profil açılır</strong><p>Dijital kartvizitin doğrudan tarayıcıda açılır.</p></article>
              <article><span>03</span><strong>Kaydet</strong><p>Karşı taraf bilgilerini tek dokunuşla rehberine ekler.</p></article>
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
                {commerceTrust.map(([icon, label]) => <span key={label}><Icon name={icon} />{label}</span>)}
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
                    label="Dijital Kartımı Oluştur"
                    appearance="secondary"
                  />
                </div>
              </article>

              <article className="products-plan-card products-premium-v2__plan-card products-premium-v2__plan-card--featured is-popular">
                <div className="products-premium-v2__featured-label">Ana ürün</div>
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
                    label="NFC Kartımı Al"
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
              <span className="products-single-kicker">YEDEK KART</span>
              <h2 id="existing-customer-title">Aynı profile ikinci kart ekleyin.</h2>
              <p>Yedek Kart yeni bir dijital kimlik veya yeni kullanım yılı açmaz. Aktif hizmet gerekir. Mevcut aktif profilinize bağlı ikinci NFC + QR karttır.</p>
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
            <span className="products-single-kicker">EKİBİNİZ İÇİN DE YENOMİ KULLANIN</span>
            <h2 id="plg-corporate-title">Aynı standardı tüm ekibe taşıyın.</h2>
            <p>Çalışan kartları, marka kontrolü ve yetkiler tek panelde yönetilsin. Ekibiniz için de Yenomi kullanın.</p>
            <Link className="home-mockup__link-secondary" href="/kurumsal">
              Kurumsal Çözümleri İncele <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
