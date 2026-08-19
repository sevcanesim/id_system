import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "Nasıl Çalışır — Yenomi ID",
  description: "Bireysel veya kurumsal dijital kartvizit: NFC + QR kartını alın, canlı profili yayınlayın, paylaşın ve görüntülenmeyi izleyin.",
};

const steps = [
  { number: "01", title: "Kartınızı Alın", text: "Bireysel NFC + QR kartınızı seçin. Kart elinize ulaştığında dijital kartvizitinizle eşleşmeye hazırdır.", visual: "card" as const },
  { number: "02", title: "Profilinizi Özelleştirin", text: "İletişim bilgilerinizi ve profesyonel kartvizitinizi tek canlı profilde düzenleyin.", visual: "profile" as const },
  { number: "03", title: "Temas Edin", text: "Kartı telefona yaklaştırın veya QR’ı okutun. Kartvizitiniz tarayıcıda açılır; uygulama gerekmez.", visual: "tap" as const },
  { number: "04", title: "Yönetin", text: "Profili güncel tutun, görüntülenmeleri izleyin. Ekipler için kartları ve markayı kurumsal panelden yönetin.", premium: true },
];

const benefits: Array<[string, string, IconName]> = [
  ["Güvenli & Şifreli", "Verileriniz güçlü güvenlik katmanlarıyla korunur.", "shield"],
  ["Anında Güncellenir", "Bilginiz her zaman güncel, her yerde etkili.", "refresh"],
  ["Global & Sınırsız", "Dünyanın her yerinden erişilebilir dijital profil.", "link"],
  ["Kontrol Sizde", "Paylaşım izinlerinizi ve profilinizi siz belirlersiniz.", "lock"],
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
          <h1 id="how-title">YENOMI ID: <em>Nasıl Çalışır?</em></h1>
          <p>Kartını al, dijital kartvizitini kur, NFC veya QR ile paylaş. Bireysel kullanım veya kurumsal ekip yönetimi.</p>
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
              {step.visual === "tap" ? (
                <div className={`how-step-visual how-step-visual--${step.number}`}>
                  <div className="how-phone-mockup">
                    <span className="how-phone-speaker" />
                    <div className="how-phone-screen">
                      <YenomiProductVisual variant="profile" compact />
                    </div>
                  </div>
                  <div className="how-qr" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
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
              <Link href={step.number === "04" ? "/kurumsal" : "/urunler/nfc-kart"} className="how-step-arrow" aria-label={`${step.title} detayları`}>→</Link>
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
        <p className="how-account-note">Kartın ve profilin hazırsa <Link href="/giris">Giriş Yap</Link></p>
      </section>
</main>
  );
}
