/**
 * Public chrome is provided by app/components/PublicSiteShell.
 * Do not mount SiteHeader/AnnouncementBar/AppFooter again on this route.
 */

import type { Metadata } from "next";
import { getDatabaseCatalog } from "../../lib/config/database";
import { formatTryFromKurus, listingPriceKurus } from "../../lib/config/product";
import { ProductVisual } from "../ui/ProductVisual";
import { ButtonLink } from "../ui/Button";
import { PublicPageTitle } from "../components/PublicPageTitle";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Kartlar & Fiyatlar",
  description: "Yenomi ID fiziksel NFC kart ve dijital kimlik paketleri.",
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
          kicker="YENOMI ID · KARTLAR & FİYATLAR"
          title={<>Fiziksel kart.<br /><em>Dijital kimlik.</em></>}
          description="Tek bir premium NFC kartla iletişim bilgilerini canlı tut. Profilini istediğin zaman güncelle, bağlantını hep aynı yerde bırak."
          className="public-page-title--catalog"
        />
        <section className="products-single-hero" aria-labelledby="products-title">
          <div className="yi-container products-single-hero__inner">
            <div className="products-single-copy">
              <span className="yi-hero__eyebrow">ÜRÜNÜ İNCELE</span>
              <h2 id="products-title">Yenomi ID NFC + QR Kart</h2>
              <p>Fiziksel kartını seç, dijital profilini aynı kalıcı bağlantıya bağla ve iletişim bilgilerini istediğin zaman güncelle.</p>
              <div className="products-single-actions">
                {nfc && <ButtonLink href={`/urunler/${nfc.slug}`} variant="dark">NFC Kartını İncele</ButtonLink>}
                <ButtonLink href="/kurumsal" variant="secondary">Kurumsal Çözümler</ButtonLink>
              </div>
            </div>
            <div className="products-single-visual" aria-label="Yenomi ID NFC kart önizlemesi">
              <ProductVisual light />
            </div>
          </div>
        </section>

        <section className="products-single-offer" aria-labelledby="offer-title">
          <div className="yi-container products-single-offer__inner">
            <div className="products-single-price-card">
              <div className="products-single-price-card__head">
                <div>
                  <span className="products-single-kicker">AKTİF ÜRÜN</span>
                  <h2 id="offer-title">{nfc?.name ?? "Yenomi ID NFC Kart"}</h2>
                </div>
                {!catalogError && <strong className="products-single-price">{formatTryFromKurus(listPriceKurus)}</strong>}
              </div>
              <div className="products-single-price-card__body">
                <ul aria-label="Ürün avantajları">
                  <li>Premium NFC kart</li>
                  <li>1 yıl dijital hizmet dahil</li>
                  <li>Canlı profil ve QR bağlantısı</li>
                  <li>Türkiye içi ücretsiz kargo</li>
                </ul>
                {nfc && <ButtonLink href={`/urunler/${nfc.slug}`} variant="primary">Paketi İncele</ButtonLink>}
              </div>
            </div>
            <div className="products-single-benefits" aria-label="Satın alma güven bilgileri">
              <article><span>01</span><strong>Tek bağlantı</strong><p>Kart değişse bile dijital profilin aynı kalır.</p></article>
              <article><span>02</span><strong>Anında güncelle</strong><p>Unvanın veya iletişim bilgin değiştiğinde kartı yenileme.</p></article>
              <article><span>03</span><strong>Uygulama gerekmez</strong><p>NFC veya QR ile profil doğrudan açılır.</p></article>
            </div>
          </div>
        </section>

        <section className="products-single-proof" aria-label="Yenomi ID satın alma bilgileri">
          <div className="yi-container products-single-proof__grid">
            <span>Türkiye içi ücretsiz kargo</span>
            <span>2 iş günü hazırlık</span>
            <span>1 yıl dijital hizmet dahil</span>
            <span>Güvenli ödeme</span>
          </div>
        </section>

        {catalogError && <p className="products-single-error" role="status">Ürün fiyatı şu anda görüntülenemiyor. Lütfen kısa süre sonra tekrar deneyin.</p>}
        {!catalogError && !nfc && <p className="products-single-error" role="status">Şu anda listelenecek aktif bir kart paketi yok.</p>}
      </main>
    </div>
  );
}
