import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "Nasıl Çalışır — Yenomi ID",
  description: "Yenomi ID ile fiziksel kartınızı alın, dijital profilinizi oluşturun, temas edin ve kimliğinizi yönetin.",
};

const steps = [
  { number: "01", title: "Kartınızı Alın", text: "Premium NFC kartınızı seçin. Kartınız elinize ulaştığında dijital kimliğinizle eşleşmeye hazırdır.", visual: "card" },
  { number: "02", title: "Profilinizi Özelleştirin", text: "İletişim bilgilerinizi, sosyal bağlantılarınızı ve profesyonel kimliğinizi tek bir canlı profilde düzenleyin.", visual: "profile" },
  { number: "03", title: "Temas Edin", text: "Kartınızı telefona yaklaştırın veya QR kodunuzu okutun. Profiliniz anında açılır; uygulama indirmek gerekmez.", visual: "card" },
  { number: "04", title: "Yönetin & Ölçekleyin", text: "Profilinizi güncel tutun, görüntülenmeleri takip edin ve ekipler için kartları, şablonları ve marka kurallarını merkezi yönetin.", premium: true },
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
          <p>Kartını al, profilini kur, NFC veya QR ile paylaş. Dört adımda aynı dijital kimlik.</p>
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
              {step.visual ? (
                <div className={`how-step-visual how-step-visual--${step.number}`}>
                  <YenomiProductVisual variant={step.visual as "profile" | "card"} compact />
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
