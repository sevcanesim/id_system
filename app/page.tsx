import type { Metadata } from "next";
import Link from "next/link";
import { YenomiProductVisual } from "./ui/YenomiProductVisual";
import howItWorks from "./home-how-it-works.module.css";

export const metadata: Metadata = {
  title: "Yenomi ID | Kartvizitin güncel kalsın",
  description: "NFC + QR kartvizit. Unvanın değişince kartı yenilemezsin. Kendin için al, ekibin için aynı standartta yönet. Ödeme iyzico güvencesinde; kart numarası Yenomi’de saklanmaz.",
  alternates: { canonical: "/" },
};

const howItWorksSteps = [
  {
    number: "01",
    title: "Kartını seç",
    text: "Mat siyah, fırçalanmış metal veya minimal beyaz. Sana uygun fiziksel kartı seç.",
    visual: "cards",
  },
  {
    number: "02",
    title: "Profilini oluştur",
    text: "İletişim bilgilerini, ünvanını ve bağlantılarını tek canlı profilde topla.",
    visual: "profile",
  },
  {
    number: "03",
    title: "Dokundur veya okut",
    text: "NFC ile yaklaştır ya da QR’ı okut. Karşı taraf uygulama indirmeden profilini açar.",
    visual: "share",
  },
  {
    number: "04",
    title: "Güncelle ve yönet",
    text: "Bilgilerin değişirse profili güncelle. Kart kaybolursa fiziksel erişimi kapat.",
    visual: "dashboard",
  },
] as const;

const proofItems = [
  ["Kartın iyzico’da kalır", "Ödeme kartı bilgileri Yenomi’de saklanmaz."],
  ["Anında güncellenir", "Ünvan veya telefon değişince yeniden baskı gerekmez."],
  ["Uygulama gerekmez", "Profil her modern tarayıcıda doğrudan açılır."],
  ["Kontrol sende", "Profilini ve fiziksel kart durumunu gerektiğinde yönetirsin."],
];

const heroTrust = [
  "Hesap açmadan ödeme",
  "Türkiye içi ücretsiz kargo",
  "Kart bilgisi Yenomi’de tutulmaz",
];

function StepVisual({ visual }: { visual: (typeof howItWorksSteps)[number]["visual"] }) {
  if (visual === "cards") {
    return (
      <div className={howItWorks.cardFan} aria-hidden="true">
        <div className={howItWorks.cardFanItem}><YenomiProductVisual variant="card" compact finish="matte" /></div>
        <div className={howItWorks.cardFanItem}><YenomiProductVisual variant="card" compact finish="metal" /></div>
        <div className={howItWorks.cardFanItem}><YenomiProductVisual variant="card" compact finish="white" /></div>
      </div>
    );
  }

  if (visual === "profile") {
    return (
      <div className={howItWorks.singleVisual} aria-hidden="true">
        <YenomiProductVisual variant="profile" compact />
      </div>
    );
  }

  if (visual === "share") {
    return (
      <div className={howItWorks.shareVisual} aria-hidden="true">
        <div className={howItWorks.shareCard}><YenomiProductVisual variant="card" compact face="back" /></div>
        <div className={howItWorks.shareProfile}><YenomiProductVisual variant="profile" compact /></div>
      </div>
    );
  }

  return (
    <div className={howItWorks.dashboardVisual} aria-hidden="true">
      <YenomiProductVisual variant="dashboard" compact />
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="home-mockup home-premium home-premium--hero-v2">
      <main id="main-content">
        <section className="home-mockup__hero home-premium__hero-v2" aria-labelledby="home-title">
          <div className="home-mockup__orbit home-mockup__orbit--left" aria-hidden="true" />
          <div className="home-mockup__orbit home-mockup__orbit--right" aria-hidden="true" />

          <div className="home-mockup__copy">
            <span className="home-premium__hero-pill"><i aria-hidden="true" /> NFC KARTVİZİT · KAYIP MODU</span>
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
                NFC Kartı Satın Al <span aria-hidden>→</span>
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

        <section className={howItWorks.section} aria-labelledby="how-it-works-title">
          <div className={howItWorks.heading}>
            <span className="home-mockup__kicker">NASIL ÇALIŞIR</span>
            <h2 id="how-it-works-title">Seç. Oluştur.<br />Paylaş. Yönet.</h2>
            <p>Tek bir kart, dört basit adım. Kurulumdan günlük kullanıma kadar tüm akış aynı yerde.</p>
          </div>

          <ol className={howItWorks.grid}>
            {howItWorksSteps.map((step) => (
              <li className={howItWorks.step} key={step.number}>
                <div className={howItWorks.stepCopy}>
                  <span className={howItWorks.stepNumber}>Adım {step.number}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <div className={howItWorks.visualWrap}>
                  <StepVisual visual={step.visual} />
                </div>
              </li>
            ))}
          </ol>

          <div className={howItWorks.proofGrid} aria-label="Yenomi ID kullanım güvenceleri">
            {proofItems.map(([title, text]) => (
              <article key={title}>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <div className={howItWorks.actionRow}>
            <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
              NFC Kartı Satın Al <span aria-hidden>→</span>
            </Link>
            <Link className="home-mockup__link-secondary" href="/nasil-calisir">
              Detaylı anlatımı gör <span aria-hidden>→</span>
            </Link>
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
              <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">NFC Kartı Satın Al <span aria-hidden>→</span></Link>
            </article>
            <article>
              <span>KURUMSAL</span>
              <h3>Ekip aynı standartta tanışır.</h3>
              <p>Çalışan kartları, yetkiler ve görünürlük tek panelde. 100 kişiye kadar doğrudan paket seç.</p>
              <Link className="home-mockup__button home-premium__path-secondary" href="/kurumsal">Ekip Paketlerini Gör <span aria-hidden>→</span></Link>
            </article>
          </div>
        </section>

        <section className="home-premium__final" aria-labelledby="final-title">
          <span className="home-mockup__kicker">DİJİTAL KARTVİZİT</span>
          <h2 id="final-title">Bir sonraki tanışmada<br />kartvizitin hazır olsun.</h2>
          <p>Kendin için tek kart seç veya ekibini aynı Yenomi ID standardında yönet.</p>
          <div className="home-mockup__actions">
            <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
              NFC Kartı Satın Al <span aria-hidden>→</span>
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
