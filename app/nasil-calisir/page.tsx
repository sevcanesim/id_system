import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "Nasıl Çalışır — Yenomi ID",
  description: "Kartı yaklaştır, güncel profil açılsın. Uygulama yok. Unvanın değişince baskı yok; kaybolursa kapatırsın.",
};

const steps = [
  { number: "01", title: "Kartını seç", text: "Bireysel NFC + QR kartını al. Kart eline geldiğinde aynı kalıcı profile bağlanır.", visual: "card" as const },
  { number: "02", title: "Profilini yayınla", text: "İletişim ve unvanın tek canlı sayfada durur. Değişince baskı yok.", visual: "profile" as const },
  { number: "03", title: "Yaklaştır veya okut", text: "NFC veya QR. Karşı taraf uygulama indirmez; profil tarayıcıda açılır.", visual: "tap" as const },
  { number: "04", title: "Kaybolursa kapat", text: "Kayıp modu fiziksel kartı durdurur. Ekipler kartı ve markayı panelden yönetir.", premium: true },
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
        <div className="how-orbit how-orbit--one" aria-hidden="true" />
        <div className="how-orbit how-orbit--two" aria-hidden="true" />
        <div className="how-planet" aria-hidden="true"><span /></div>
        <div className="how-hero-inner">
          <span className="section-kicker">YENOMI ID</span>
          <h1 id="how-title">Kartı yaklaştır.<br /><em>Güncel profil açılsın.</em></h1>
          <p>Uygulama yok. Unvanın değişince baskı yok. Kaybolursa kapatırsın. Kendin için al, ekibin için yönet.</p>
        </div>
      </section>

      <section className="how-steps" aria-labelledby="how-steps-title">
        <h2 id="how-steps-title" className="sr-only">Yenomi ID dört adımda nasıl çalışır?</h2>
        <div className="how-flow-line" aria-hidden="true" />
        <div className="how-step-grid">
          {steps.map((step) => (
            <article key={step.number} className={`how-step-card${step.premium ? " how-step-card--premium" : ""}`}>
              <div className="how-step-top">
                <span className="how-step-number">Adım {Number(step.number)}</span>
                {step.premium && <span className="how-premium-badge">PREMIUM</span>}
              </div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              {step.visual === "tap" || step.visual === "profile" ? (
                <div className={`how-step-visual how-step-visual--${step.number}`}>
                  <div className="how-phone-mockup">
                    <span className="how-phone-speaker" />
                    <div className="how-phone-screen">
                      <YenomiProductVisual variant="profile" compact />
                    </div>
                  </div>
                  {step.visual === "tap" ? (
                    <div className="how-qr" aria-hidden="true"><Icon name="qr" /></div>
                  ) : null}
                </div>
              ) : step.visual ? (
                <div className={`how-step-visual how-step-visual--${step.number}`}>
                  <YenomiProductVisual variant={step.visual} compact />
                </div>
              ) : (
                <div className="how-dashboard" aria-label="Yönetim paneli önizlemesi">
                  <div className="how-dashboard-bar"><span>Yenomi ID</span><i/><i/><i/></div>
                  <div className="how-dashboard-kpis"><b>12.8K<small>Görüntülenme</small></b><b>4.2K<small>Bağlantı</small></b><b>1.6K<small>Profil</small></b></div>
                  <div className="how-dashboard-grid"><div className="how-chart"><span/><span/><span/><span/><span/></div><div className="how-mini-list"><i/><i/><i/><i/></div><div className="how-mini-chart"><span/><span/><span/><span/></div><div className="how-mini-list"><i/><i/><i/></div></div>
                </div>
              )}
              <Link href={step.number === "04" ? "/kurumsal" : "/urunler/nfc-kart"} className="how-step-cta">
                {step.number === "04" ? "Ekip paketini incele" : "NFC Kartı Satın Al"}
              </Link>
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
        <p className="how-account-note">Kartın yoksa <Link href="/urunler/nfc-kart">NFC Kartı Satın Al</Link>. Hazırsa <Link href="/giris">Hesabına gir</Link>.</p>
      </section>
</main>
  );
}
