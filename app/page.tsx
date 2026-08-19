import type { Metadata } from "next";
import Link from "next/link";
import { YenomiProductVisual } from "./ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "Yenomi ID | Dijital kartvizit",
  description: "Bireysel ve kurumsal dijital kartvizit. NFC + QR kart, canlı profil ve görüntülenme takibi.",
  alternates: { canonical: "/" },
};

const principles = [
  ["01", "NFC + QR", "Kartı yaklaştır veya QR’ı okut; dijital kartvizitin tarayıcıda açılsın."],
  ["02", "Canlı profil", "Unvanın veya iletişim bilgin değişince kartı yenilemezsin; profil güncellenir."],
  ["03", "Görüntülenme", "Kartın kaç kez açıldığını ve hangi bağlantıların tıklandığını panelden izlersin."],
];

const journey = [
  ["01", "Kartını seç", "Bireysel NFC + QR kartı incele ve siparişini tamamla."],
  ["02", "Profilini kur", "Dijital kartvizitini kendi bilgilerinle yayınla."],
  ["03", "Paylaş ve izle", "NFC veya QR ile paylaş; görüntülenmeyi hesabından takip et."],
];

export default function HomePage() {
  return (
    <div className="home-mockup home-premium">
      <main id="main-content">
        <section className="home-mockup__hero" aria-labelledby="home-title">
          <div className="home-mockup__orbit home-mockup__orbit--left" aria-hidden="true" />
          <div className="home-mockup__orbit home-mockup__orbit--right" aria-hidden="true" />

          <div className="home-mockup__copy">
            <span className="home-mockup__kicker">YENOMI ID · DİJİTAL KARTVİZİT</span>
            <h1 id="home-title">
              Dijital kartvizitin.<br />
              <em>Bireysel veya kurumsal.</em>
            </h1>
            <p>
              Yenomi ID, NFC + QR kartını canlı dijital karta bağlar. Kendin için kullan
              veya ekibini aynı marka standardıyla yönet. Bilgi değişince kart değil,
              profil güncellenir.
            </p>

            <div className="home-mockup__actions">
              <Link className="home-mockup__button home-mockup__button--gold home-mockup__button--primary" href="/urunler/nfc-kart">
                Dijital kartviziti incele <span aria-hidden>→</span>
              </Link>
              <Link className="home-mockup__link-secondary" href="/kurumsal">
                Kurumsal çözümü gör <span aria-hidden>→</span>
              </Link>
            </div>

            <div className="home-mockup__meta" aria-label="Ürün özellikleri">
              <span>BİREYSEL</span>
              <span>KURUMSAL</span>
              <span>NFC + QR</span>
              <span>GÖRÜNTÜLENME</span>
            </div>
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
            <span className="home-mockup__kicker">YENOMI ID</span>
            <h2 id="paths-title">Aynı dijital kartvizit.<br /><em>İki kullanım.</em></h2>
          </div>
          <div className="home-premium__path-grid">
            <article>
              <span>BİREYSEL</span>
              <h3>Dijital kartvizit bireysel</h3>
              <p>Kendi NFC + QR kartın, canlı profilin ve görüntülenme takibin.</p>
              <Link href="/urunler/nfc-kart">Kartı incele <span aria-hidden>→</span></Link>
            </article>
            <article>
              <span>KURUMSAL</span>
              <h3>Dijital kartvizit kurumsal</h3>
              <p>Çalışan kartları, marka standardı, yetkiler ve ekip analitikleri tek panelde.</p>
              <Link href="/kurumsal">Kurumsal çözümü incele <span aria-hidden>→</span></Link>
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
              NFC veya QR aynı kalıcı profile açılır. Unvan, telefon veya şirket değişince
              kartı yeniden bastırman gerekmez.
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
            <p>Satın alma, yayın ve paylaşım birbirine bağlanır; her adımda ne yapacağın nettir.</p>
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
            <p><strong>Paylaşmak için uygulama gerekmez.</strong> NFC veya QR ile profil tarayıcıda açılır.</p>
            <Link className="home-mockup__link-secondary" href="/nasil-calisir">Nasıl çalıştığını gör <span aria-hidden>→</span></Link>
          </div>
        </section>

        <section className="home-premium__final" aria-labelledby="final-title">
          <span className="home-mockup__kicker">DİJİTAL KARTVİZİT</span>
          <h2 id="final-title">Kendin için al.<br /><em>Ekibin için yönet.</em></h2>
          <p>Bireysel kart veya kurumsal panel — ikisi de aynı Yenomi ID dijital kartvizit üzerine kurulur.</p>
          <div className="home-mockup__actions">
            <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
              NFC Kartı İncele <span aria-hidden>→</span>
            </Link>
            <Link className="home-mockup__link-secondary" href="/kurumsal">
              Kurumsal çözümü gör <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
