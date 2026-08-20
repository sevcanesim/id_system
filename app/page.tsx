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
  ["01", "Kartını seç", "Bireysel NFC + QR veya ekip paketi. Fiyat ödeme adımında sunucuda doğrulanır."],
  ["02", "Profilini yayınla", "Ödemeden sonra hesabını bağla. Bilgilerin aynı kalıcı bağlantıda durur."],
  ["03", "Paylaş ve izle", "Dokunuş veya QR. Görüntülenmeyi panelden gör."],
];

export default function HomePage() {
  return (
    <div className="home-mockup home-premium">
      <main id="main-content">
        <section className="home-mockup__hero" aria-labelledby="home-title">
          <div className="home-mockup__orbit home-mockup__orbit--left" aria-hidden="true" />
          <div className="home-mockup__orbit home-mockup__orbit--right" aria-hidden="true" />

          <div className="home-mockup__copy">
            <span className="home-mockup__kicker">YENOMI ID · NFC KARTVİZİT</span>
            <h1 id="home-title">
              Kart bir kez basılır.<br />
              <em>Kimliğin her gün güncel kalır.</em>
            </h1>
            <p>
              Fiziksel NFC + QR kartın, canlı dijital kartvizitine bağlanır. Kağıt gibi eskimez.
              Kendin için al; ekibini tek panelden aynı standartta yönet.
            </p>

            <div className="home-mockup__actions">
              <Link className="home-mockup__button home-mockup__button--gold home-mockup__button--primary" href="/urunler/nfc-kart">
                NFC Kartı Satın Al <span aria-hidden>→</span>
              </Link>
              <Link className="home-mockup__link-secondary" href="/kurumsal">
                Ekip paketini incele <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="home-mockup__meta" aria-label="Ürün özellikleri">
              <span>BİREYSEL</span>
              <span>KURUMSAL</span>
              <span>NFC + QR</span>
              <span>KAYIP MODU</span>
            </div>
            <small className="home-mockup__guest">Hesap açmadan ödeyebilirsin. Kart numarası Yenomi’de saklanmaz.</small>
          </div>

          <div className="home-mockup__visual" aria-label="Yenomi ID dijital kartvizit önizlemesi">
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
            <h2 id="paths-title">Aynı sistem.<br /><em>İki ölçek.</em></h2>
          </div>
          <div className="home-premium__path-grid">
            <article>
              <span>BİREYSEL</span>
              <h3>Tek kart. Her tanışmada güncel.</h3>
              <p>NFC + QR kartın, canlı profilin ve kayıp modun. Unvanın değişince baskı yok.</p>
              <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">NFC Kartı Satın Al <span aria-hidden>→</span></Link>
            </article>
            <article>
              <span>KURUMSAL</span>
              <h3>Ekip aynı standartta tanışır.</h3>
              <p>Çalışan kartları, yetkiler ve analitik tek panelde. 100 kişiye kadar sepete ekle.</p>
              <Link className="home-mockup__button home-premium__path-secondary" href="/kurumsal">Paketleri incele <span aria-hidden>→</span></Link>
            </article>
          </div>
        </section>

        <section className="home-premium__proof" aria-labelledby="proof-title">
          <div className="home-premium__proof-head">
            <div>
              <span className="home-mockup__kicker">FİZİKSEL KART · CANLI PROFİL</span>
              <h2 id="proof-title">Kartın fiziksel.<br /><em>Kartvizitin dijital.</em></h2>
            </div>
            <p>
              NFC veya QR aynı kalıcı profile açılır. Kart numarası iyzico’da işlenir; Yenomi’de saklanmaz.
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
              <h2 id="journey-title">Seç, bağla,<br /><em>paylaş.</em></h2>
            </div>
            <p>Hesap açmadan ödeyebilirsin. Sipariş, yazdığın e-posta ile hesabına bağlanır.</p>
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
            <p><strong>Karşı taraf uygulama indirmez.</strong> Profil tarayıcıda açılır.</p>
            <Link className="home-mockup__link-secondary" href="/nasil-calisir">Nasıl çalıştığını gör <span aria-hidden>→</span></Link>
          </div>
        </section>

        <section className="home-premium__final" aria-labelledby="final-title">
          <span className="home-mockup__kicker">DİJİTAL KARTVİZİT</span>
          <h2 id="final-title">Bir sonraki tanışmada<br /><em>sistemin hazır olsun.</em></h2>
          <p>Bireysel kart veya kurumsal panel — ikisi de aynı Yenomi ID altyapısı.</p>
          <div className="home-mockup__actions">
            <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
              NFC Kartı Satın Al <span aria-hidden>→</span>
            </Link>
            <Link className="home-mockup__link-secondary" href="/kurumsal">
              Ekip paketini incele <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
