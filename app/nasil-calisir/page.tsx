import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "Nasıl Çalışır — Yenomi ID",
  description: "Kartı yaklaştır, güncel profil açılsın. Uygulama yok. Unvanın değişince baskı yok; kaybolursa kapatırsın.",
};

const finishes = [
  { id: "matte", finish: "matte" as const, label: "Mat siyah", prev: "white", next: "metal" },
  { id: "metal", finish: "metal" as const, label: "Fırçalanmış metal", prev: "matte", next: "white" },
  { id: "white", finish: "white" as const, label: "Minimal beyaz", prev: "metal", next: "matte" },
];

const laterSteps = [
  { number: "02", title: "Profilini yayınla", text: "İletişim ve unvanın tek canlı sayfada durur. Değişince baskı yok.", visual: "profile" as const },
  { number: "03", title: "Yaklaştır veya okut", text: "NFC veya QR. Karşı taraf uygulama indirmez; profil tarayıcıda açılır.", visual: "tap" as const },
  { number: "04", title: "Kaybolursa kapat", text: "Kayıp modu fiziksel kartı durdurur. Dijital kimliğin sende kalır.", premium: true },
];

const benefits: Array<[string, string, IconName]> = [
  ["Kartın iyzico’da kalır", "Ödeme kartı numarası Yenomi sunucularında tutulmaz.", "shield"],
  ["Anında güncellenir", "Unvan veya telefon değişince kartı yeniden basmazsın.", "refresh"],
  ["Uygulama gerekmez", "Profil her yerde tarayıcıda açılır.", "link"],
  ["Kontrol sende", "Kayıp modu, yayın ve yetki sende kalır.", "lock"],
];

export default function HowItWorksPage() {
  return (
    <main id="main-content" className="how-it-works-page">

      <section className="how-hero" aria-labelledby="how-title">
        <div className="how-hero-inner">
          <span className="section-kicker">YENOMI ID</span>
          <h1 id="how-title">Kartı yaklaştır.<br />Güncel profil açılsın.</h1>
          <p>Uygulama yok. Unvanın değişince baskı yok. Kaybolursa kapatırsın. Kendin için al, ekibin için yönet.</p>
        </div>
      </section>

      <section className="how-steps" aria-labelledby="how-steps-title">
        <h2 id="how-steps-title" className="sr-only">Yenomi ID dört adımda nasıl çalışır?</h2>
        <div className="how-flow-line" aria-hidden="true" />

        <article className="how-step-feature">
          <span className="how-step-number">Adım 1</span>
          <h3>Tarzını ve Kartını Seç</h3>
          <p>Size en uygun tasarımı belirleyin; akıllı NFC ve QR özellikli kartınız adresinize gelsin.</p>

          <div className="how-card-gallery">
            {finishes.map((option, index) => (
              <input
                key={option.id}
                className="sr-only"
                type="radio"
                name="how-card-finish"
                id={`how-card-${option.id}`}
                defaultChecked={index === 1}
              />
            ))}
            <div className="how-card-gallery__stage" aria-label="Kart malzemesi">
              {finishes.map((option) => (
                <label
                  key={option.id}
                  htmlFor={`how-card-${option.id}`}
                  className={`how-card-gallery__item how-card-gallery__item--${option.id}`}
                >
                  <YenomiProductVisual variant="card" finish={option.finish} compact />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <div className="how-card-gallery__nav">
              {finishes.map((option) => (
                <span key={option.id} className={`how-card-gallery__arrows how-card-gallery__arrows--${option.id}`}>
                  <label htmlFor={`how-card-${option.prev}`} className="how-card-gallery__arrow">
                    <span className="sr-only">Önceki kart</span>
                    <Icon name="chevronLeft" />
                  </label>
                  <label htmlFor={`how-card-${option.next}`} className="how-card-gallery__arrow">
                    <span className="sr-only">Sonraki kart</span>
                    <Icon name="chevronRight" />
                  </label>
                </span>
              ))}
            </div>
          </div>

          <div className="how-step-feature__notes">
            {benefits.slice(0, 2).map(([title, text, icon]) => (
              <article key={title}>
                <span className="how-benefit-icon"><Icon name={icon} /></span>
                <div>
                  <h4>{title}</h4>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </article>

        <div className="how-step-grid">
          {laterSteps.map((step) => (
            <article key={step.number} className={`how-step-card${step.premium ? " how-step-card--premium" : ""}`}>
              <div className="how-step-top">
                <span className="how-step-number">Adım {Number(step.number)}</span>
                {step.premium && <span className="how-premium-badge">PREMIUM</span>}
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {step.visual === "tap" || step.visual === "profile" ? (
                <div className={`how-step-visual how-step-visual--${step.number}`}>
                  <YenomiProductVisual variant="profile" compact />
                  {step.visual === "tap" ? (
                    <div className="how-qr" aria-hidden="true"><Icon name="qr" /></div>
                  ) : null}
                </div>
              ) : (
                <div className="how-dashboard" aria-label="Yönetim paneli önizlemesi">
                  <div className="how-dashboard-bar"><span>Yenomi ID</span><i/><i/><i/></div>
                  <div className="how-dashboard-kpis"><b>Görüntülenme</b><b>Bağlantı</b><b>Profil</b></div>
                  <div className="how-dashboard-grid"><div className="how-chart"><span/><span/><span/><span/><span/></div><div className="how-mini-list"><i/><i/><i/><i/></div><div className="how-mini-chart"><span/><span/><span/><span/></div><div className="how-mini-list"><i/><i/><i/></div></div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="how-benefits" aria-label="Yenomi ID avantajları">
        <div className="how-benefits-grid">
          {benefits.map(([title, text, icon]) => (
            <article key={title}>
              <span className="how-benefit-icon"><Icon name={icon} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </article>
          ))}
        </div>
        <p className="how-account-note">Karşı taraf uygulama indirmez. Profil tarayıcıda açılır.</p>
        <div className="how-account-actions">
          <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart">NFC Kartı Satın Al</Link>
          <Link className="home-mockup__link-secondary" href="/giris">Hesabına gir</Link>
        </div>
      </section>
</main>
  );
}
