import type { Metadata } from "next";
import Link from "next/link";
import { YenomiProductVisual } from "./ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "Yenomi ID | Kartvizitin güncel kalsın",
  description: "NFC + QR kartvizit. Unvanın değişince kartı yenilemezsin. Kendin için al, ekibin için aynı standartta yönet. Ödeme iyzico güvencesinde; kart numarası Yenomi’de saklanmaz.",
  alternates: { canonical: "/" },
};

const principles = [
  ["01", "Yaklaştır, paylaş", "NFC veya QR aynı canlı profile açılır. Karşı taraf uygulama indirmez."],
  ["02", "Kart aynı, bilgi yeni", "Unvan, telefon veya şirket değişince baskıyı tekrarlamazsın; profil güncellenir."],
  ["03", "Kaybolursa kapanır", "Kayıp modu fiziksel kartı durdurur. Dijital kimliğin sende kalır."],
];

const journey = [
  ["01", "Kartını seç", "Bireysel NFC + QR veya ekip paketini seç. Fiyat ve kapsam ödeme öncesi net görünür."],
  ["02", "Profilini yayınla", "Ödemeden sonra hesabını bağla. Bilgilerin aynı kalıcı bağlantıda güncel kalır."],
  ["03", "Paylaş ve yönet", "NFC veya QR ile paylaş. Kartını ve profilini gerektiğinde uzaktan güncelle."],
];

const heroTrust = [
  "Hesap açmadan ödeme",
  "Türkiye içi ücretsiz kargo",
  "Kart bilgisi Yenomi’de tutulmaz",
];

export default function HomePage() {
  return (
    <div className="home-mockup home-premium home-premium--hero-v2">
      <main id="main-content">
        <section className="home-mockup__hero home-premium__hero-v2" aria-labelledby="home-title">
          <div className="home-mockup__orbit home-mockup__orbit--left" aria-hidden="true" />
          <div className="home-mockup__orbit home-mockup__orbit--right" aria-hidden="true" />

          <div className="home-mockup__copy">
            <span className="home-premium__hero-pill"><i aria-hidden="true" /> NFC KARTVİZİT · DİJİTAL KİMLİK</span>
            <h1 id="home-title">
              Kart bir kez basılır.<br />
              <span>Kimliğin her gün güncel kalır.</span>
            </h1>
            <p>
              Fiziksel NFC + QR kartın, canlı dijital kartvizitine bağlanır. Bilgilerin değiştiğinde kartı değil profilini güncelle.
              Tek kartla paylaş, gerektiğinde uzaktan yönet.
            </p>

            <div className="home-mockup__actions home-premium__hero-actions">
              <Link className="home-mockup__button home-mockup__button--gold home-mockup__button--primary" href="/urunler/nfc-kart">
                NFC Kartımı Seç <span aria-hidden>→</span>
              </Link>
              <Link className="home-premium__hero-secondary" href="/kurumsal">
                Ekip Paketini İncele <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="home-premium__hero-trust" aria-label="Satın alma güvenceleri">
              {heroTrust.map((item) => <span key={item}><i aria-hidden="true">✓</i>{item}</span>)}
            </div>
          </div>

          <div className="home-mockup__visual home-premium__hero-stage" aria-label="Yenomi ID dijital kartvizit önizlemesi">
            <div className="home-premium__hero-stage-label" aria-hidden="true">CANLI PROFİL · NFC + QR</div>
            <div className="home-mockup__halo" aria-hidden="true" />
            <div className="home-mockup__phone">
              <YenomiProductVisual variant="profile" />
            </div>
            <div className="home-mockup__card">
              <YenomiProductVisual variant="card" />
            </div>
          </div>
        </section>

        <section className="home-premium__paths" aria-labelledby="paths-title">
          <div className="home-premium__paths-head">
            <span className="home-mockup__kicker">BİREYSEL · KURUMSAL</span>
            <h2 id="paths-title">Aynı sistem.<br />İki ölçek.</h2>
          </div>
          <div className="home-premium__path-grid">
            <article>
              <span>BİREYSEL</span>
              <h3>Tek kart. Her tanışmada güncel.</h3>
              <p>NFC + QR kartın, canlı profilin ve kayıp modun. Bilgilerin değişince yeniden baskı yok.</p>
              <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">Kartımı Seç <span aria-hidden>→</span></Link>
            </article>
            <article>
              <span>KURUMSAL</span>
              <h3>Ekip aynı standartta tanışır.</h3>
              <p>Çalışan kartları, yetkiler ve görünürlük tek panelde. 100 kişiye kadar doğrudan paket seç.</p>
              <Link className="home-mockup__button home-premium__path-secondary" href="/kurumsal">Ekip Paketlerini Gör <span aria-hidden>→</span></Link>
            </article>
          </div>
        </section>

        <section className="home-premium__proof" aria-labelledby="proof-title">
          <div className="home-premium__proof-head">
            <div>
              <span className="home-mockup__kicker">FİZİKSEL KART · CANLI PROFİL</span>
              <h2 id="proof-title">Kartın fiziksel.<br />Kartvizitin dijital.</h2>
            </div>
            <p>NFC veya QR aynı kalıcı profile açılır. Karşı taraf uygulama indirmez; profil tarayıcıda açılır.</p>
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
              <h2 id="journey-title">Seç, bağla,<br />paylaş.</h2>
            </div>
            <p>Satın alırken hesap açmak zorunda değilsin. Siparişin e-posta adresinle hesabına bağlanır.</p>
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
            <p><strong>Uygulama indirme yok.</strong> NFC veya QR ile profil doğrudan tarayıcıda açılır.</p>
            <Link className="home-mockup__link-secondary" href="/nasil-calisir">30 saniyede nasıl çalıştığını gör <span aria-hidden>→</span></Link>
          </div>
        </section>

        <section className="home-premium__final" aria-labelledby="final-title">
          <span className="home-mockup__kicker">DİJİTAL KARTVİZİT</span>
          <h2 id="final-title">Bir sonraki tanışmada<br />kartvizitin hazır olsun.</h2>
          <p>Kendin için tek kart seç veya ekibini aynı Yenomi ID standardında yönet.</p>
          <div className="home-mockup__actions">
            <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
              Kartımı Seç <span aria-hidden>→</span>
            </Link>
            <Link className="home-mockup__link-secondary" href="/kurumsal">
              Ekip Paketlerini Gör <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
