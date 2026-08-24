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

        <section id="planlar" className="products-commerce-v3__plans products-commerce-v4__offer" aria-labelledby="offer-title">
          <div className="yi-container">
            <header className="products-commerce-v3__section-head products-commerce-v4__section-head">
              <div>
                <span className="products-commerce-v3__eyebrow">YENOMI ID</span>
                <h2 id="offer-title">Ana ürün tek. İhtiyacın büyürse yükselt.</h2>
              </div>
              <p>Çoğu kullanıcı için doğru başlangıç Yenomi ID’dir. Premium ek araçlar açar; sadece dijital seçenek fiziksel kart istemeyenler içindir.</p>
            </header>

            <div className="products-commerce-v4__decision-grid">
              <article className="products-commerce-v4__primary-offer">
                <div className="products-commerce-v4__offer-copy">
                  <span className="products-commerce-v4__offer-kicker">ÖNERİLEN BAŞLANGIÇ</span>
                  <h3>{INDIVIDUAL_PLAN.name}</h3>
                  <p>Fiziksel NFC + QR kart, canlı dijital profil ve 1 yıl platform erişimi tek pakette.</p>
                  <ul>
                    {INDIVIDUAL_CATALOG_POINTS.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}
                  </ul>
                </div>
                <div className="products-commerce-v4__offer-buy">
                  <span>Tek seferlik</span>
                  <strong>{formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus)}</strong>
                  <AddToCartButton
                    productId={NFC_PRODUCT.slug}
                    variantSku={COMMERCIAL_SKUS.INITIAL}
                    kind="NFC_PHYSICAL_CARD"
                    name="Yenomi ID NFC Kart"
                    unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus}
                    label="Yenomi ID’mi Al"
                  />
                  <small>1 yıl erişim + kargo dahil</small>
                </div>
              </article>

              <article className="products-commerce-v4__upgrade">
                <div>
                  <span className="products-commerce-v4__offer-kicker">DAHA FAZLASI GEREKİYORSA</span>
                  <h3>{INDIVIDUAL_PREMIUM_PLAN.name}</h3>
                  <p>Yenomi ID’ye toplantı, sunum, kişi yönetimi ve Network Mail araçlarını ekler.</p>
                </div>
                <div className="products-commerce-v4__upgrade-bottom">
                  <strong>{formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus)}</strong>
                  <AddToCartButton
                    productId={NFC_PRODUCT.slug}
                    variantSku={COMMERCIAL_SKUS.PREMIUM}
                    kind="NFC_PHYSICAL_CARD"
                    name="Yenomi ID Premium — NFC + 500 Network Mail"
                    unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus}
                    label="Premium’a Yükselt"
                    appearance="secondary"
                  />
                </div>
                <details className="products-commerce-v4__details">
                  <summary>Premium’da neler var?</summary>
                  <ul>
                    {INDIVIDUAL_PREMIUM_CATALOG_POINTS.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}
                  </ul>
                </details>
              </article>
            </div>

            <aside className="products-commerce-v4__digital" aria-label="Sadece dijital Yenomi ID seçeneği">
              <div>
                <span className="products-commerce-v4__offer-kicker">FİZİKSEL KART İSTEMİYOR MUSUN?</span>
                <h3>{INDIVIDUAL_DIGITAL_PLAN.name}</h3>
                <p>Canlı dijital kartvizit ve QR paylaşımıyla başla. NFC kart dahil değildir.</p>
                <details className="products-commerce-v4__details">
                  <summary>Dijital paket içeriği</summary>
                  <ul>
                    {INDIVIDUAL_DIGITAL_CATALOG_POINTS.map((item) => <li key={item}><Icon name="check" /><span>{item}</span></li>)}
                  </ul>
                </details>
              </div>
              <div className="products-commerce-v4__digital-buy">
                <strong>{formatTryFromKurus(INDIVIDUAL_DIGITAL_PLAN.priceKurus)}</strong>
                <AddToCartButton
                  productId={NFC_PRODUCT.slug}
                  variantSku={COMMERCIAL_SKUS.DIGITAL}
                  kind="NFC_PHYSICAL_CARD"
                  name="Yenomi ID Dijital Kartvizit"
                  unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_DIGITAL.priceKurus}
                  label="Sadece Dijital ile Başla"
                  appearance="secondary"
                />
              </div>
            </aside>
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
