import Link from "next/link";
import { formatTryFromKurus } from "../../lib/config/product";
import { INDIVIDUAL_PREMIUM_PLAN } from "../../lib/commerce/packages";
import { COMMERCIAL_FULFILLMENT } from "../../lib/config/commercial";
import { Icon } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";

const premiumPrice = formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus);

const heroTrust = [
  COMMERCIAL_FULFILLMENT.domesticShipping,
  COMMERCIAL_FULFILLMENT.handover,
  "Uygulama gerekmez",
  "KAYIP MODU · Kaybolursa erişimi kapat",
];

export function HeroSection() {
  return (
    <section
      className="home-mockup__hero home-premium__hero-v2 home-sales-hero"
      aria-labelledby="home-title"
    >
      <div className="home-mockup__copy home-sales-copy">
        <span className="home-premium__hero-pill">
          <i aria-hidden="true" /> YENOMI ID PREMIUM · NFC + QR
        </span>
        <h1 id="home-title">
          Kartın konuşsun.
          <br />
          <span>Sen bağlantıda kal.</span>
        </h1>
        <p>
          NFC veya QR ile kendini anında tanıt; yeni bağlantılarını tek
          merkezden yönet ve doğru zamanda takipte kal.
        </p>
        <div className="home-mockup__actions home-premium__hero-actions home-sales-actions">
          <Link
            className="home-mockup__button home-mockup__button--gold home-mockup__button--primary"
            href="/urunler/nfc-kart?paket=premium"
          >
            Premium ile Başla <span aria-hidden>→</span>
          </Link>
          <Link
            className="home-premium__hero-secondary"
            href="#paths-title"
          >
            Sana uygun paketi gör <span aria-hidden>↓</span>
          </Link>
        </div>
        <div className="home-sales-offer">
          <strong>{premiumPrice} · ilk yıl dahil</strong>
          <span>NFC + QR kart · kişi yönetimi · 100 Network Mail</span>
        </div>
        <div className="home-premium__hero-trust home-sales-trust">
          {heroTrust.map((item) => (
            <span key={item}>
              <Icon name="check" />
              {item}
            </span>
          ))}
        </div>
      </div>
      <div
        className="home-sales-stage"
        aria-label="Yenomi ID Premium ürün görseli"
      >
        <div className="home-sales-stage-label" aria-hidden="true">
          PREMIUM · NFC + QR · CANLI PROFİL
        </div>
        <div className="home-sales-stage-glow" aria-hidden="true" />
        <div className="home-hero-specimens">
          <YenomiProductVisual variant="card" finish="matte" />
          <YenomiProductVisual variant="profile" compact />
        </div>
        <div className="home-sales-capabilities" aria-hidden="true">
          <span>NFC</span>
          <span>QR</span>
          <span>Network Mail</span>
        </div>
      </div>
    </section>
  );
}
