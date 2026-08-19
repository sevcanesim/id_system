import type { Metadata } from "next";
import Link from "next/link";
import { YenomiProductVisual } from "./ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "Yenomi ID | Profesyonel dijital kimliğin",
  description: "Premium NFC kart, canlı dijital profil ve kalıcı dijital kimlik deneyimi.",
  alternates: { canonical: "/" },
};

const principles = [
  ["01", "İlk temas", "Premium NFC kartın, fiziksel dünyadaki ilk izlenimini taşır."],
  ["02", "Canlı profil", "Bilgilerin tek bağlantıda güncel kalır; yeniden kart bastırman gerekmez."],
  ["03", "Her yerde paylaş", "NFC veya QR ile profilini saniyeler içinde aç ve paylaş."],
];

const journey = [
  ["01", "Kartını seç", "İhtiyacına uygun NFC kartı incele ve siparişini güvenle tamamla."],
  ["02", "Kimliğini kur", "Kartın hazır olduğunda dijital profilini kendi bilgilerinle tamamla."],
  ["03", "Her yerde paylaş", "Tek dokunuşla veya QR ile güncel profilini anında aç."],
];

export default function HomePage() {
  return (
    <div className="home-mockup home-premium">
      <main id="main-content">
        <section className="home-mockup__hero" aria-labelledby="home-title">
          <div className="home-mockup__orbit home-mockup__orbit--left" aria-hidden="true" />
          <div className="home-mockup__orbit home-mockup__orbit--right" aria-hidden="true" />

          <div className="home-mockup__copy">
            <span className="home-mockup__kicker">YENOMI ID · PROFESYONEL DİJİTAL KİMLİK</span>
            <h1 id="home-title">
              Profesyonel kimliğin.<br />
              <em>Tek bir bağlantıda.</em>
            </h1>
            <p>
              Yenomi ID; premium NFC kartını, canlı dijital profilini ve QR paylaşımını
              tek bir profesyonel kimlikte birleştirir. Bilgilerin değiştiğinde kartın değil,
              dijital profilin güncellenir.
            </p>

            <div className="home-mockup__actions">
              <Link className="home-mockup__button home-mockup__button--gold home-mockup__button--primary" href="/urunler/nfc-kart">
                Yenomi ID’mi Başlat <span aria-hidden>→</span>
              </Link>
              <Link className="home-mockup__link-secondary" href="#proof-title">
                Nasıl çalıştığını gör <span aria-hidden>↓</span>
              </Link>
            </div>

            <div className="home-mockup__meta" aria-label="Ürün özellikleri">
              <span>1 YIL DİJİTAL HİZMET</span>
              <span>NFC + QR</span>
              <span>UYGULAMA GEREKMEZ</span>
              <span>GÜVENLİ ÖDEME</span>
            </div>
          </div>

          <div className="home-mockup__visual" aria-label="Yenomi ID kart ve canlı profil önizlemesi">
            <div className="home-mockup__halo" aria-hidden="true" />
            <div className="home-mockup__phone">
              <YenomiProductVisual variant="profile" />
            </div>
            <div className="home-mockup__card">
              <YenomiProductVisual variant="card" />
            </div>
          </div>
        </section>

        <section className="home-premium__proof" aria-labelledby="proof-title">
          <div className="home-premium__proof-head">
            <div>
              <span className="home-mockup__kicker">DİJİTAL KİMLİĞİN ÖTESİ</span>
              <h2 id="proof-title">Kartın fiziksel.<br /><em>Kimliğin dijital.</em></h2>
            </div>
            <p>
              Tek ürün, tek profil, tek bağlantı. Yenomi ID; tanışma anından
              sonrasına kadar profesyonel kimliğini güncel ve erişilebilir tutar.
            </p>
          </div>

          <div className="home-premium__principles">
            {principles.map(([number, title, text]) => (
              <article key={number}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="home-premium__journey" aria-labelledby="journey-title">
          <div className="home-premium__journey-head">
            <div>
              <span className="home-mockup__kicker">NET BİR BAŞLANGIÇ</span>
              <h2 id="journey-title">Karttan profile,<br /><em>tek akışta.</em></h2>
            </div>
            <p>Satın alma, aktivasyon ve paylaşım birbirine bağlanır; her adımda ne yapacağın nettir.</p>
          </div>
          <ol className="home-premium__journey-steps">
            {journey.map(([number, title, text]) => (
              <li key={number}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </li>
            ))}
          </ol>
          <div className="home-premium__journey-action">
            <p><strong>Paylaşmak için uygulama gerekmez.</strong> NFC veya QR ile profilin doğrudan tarayıcıda açılır.</p>
            <Link className="home-mockup__link-secondary" href="/nasil-calisir">Nasıl çalıştığını gör <span aria-hidden>→</span></Link>
          </div>
        </section>

        <section className="home-premium__final" aria-labelledby="final-title">
          <span className="home-mockup__kicker">YENOMI ID</span>
          <h2 id="final-title">Profesyonel görün.<br /><em>Bağlantını kalıcı tut.</em></h2>
          <p>Bir sonraki tanışmada sistemin hazır olsun.</p>
          <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
            NFC Kartı İncele <span aria-hidden>→</span>
          </Link>
          <ul className="home-premium__trust" aria-label="Yenomi ID güven ve ürün bilgileri">
            <li>1 yıl dijital hizmet dahil</li>
            <li>iyzico ile güvenli ödeme</li>
            <li>Türkiye içi ücretsiz kargo</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
