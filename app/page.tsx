import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NFC_PRODUCT, formatTryFromKurus } from "../lib/config/product";
import howItWorks from "./home-how-it-works.module.css";
import homePolish from "./home-premium-polish.module.css";
import faqStyles from "./home-faq.module.css";

export const metadata: Metadata = {
  title: "Yenomi ID | Kartvizitin güncel kalsın",
  description: "NFC + QR kartvizit. Unvanın değişince kartı yenilemezsin. Kendin için al, ekibin için aynı standartta yönet. Ödeme iyzico güvencesinde; kart numarası Yenomi’de saklanmaz.",
  alternates: { canonical: "/" },
};

const initialPrice = formatTryFromKurus(NFC_PRODUCT.unitPriceKurus);

const howItWorksSteps = [
  {
    number: "01",
    title: "Kartını seç",
    text: "Fiziksel NFC + QR kartını seç. Kartın tek bir kalıcı dijital profile bağlanır.",
  },
  {
    number: "02",
    title: "Profilini oluştur",
    text: "İletişim bilgilerini, ünvanını ve bağlantılarını tek canlı profilde topla.",
  },
  {
    number: "03",
    title: "Dokundur veya okut",
    text: "NFC ile yaklaştır ya da QR’ı okut. Karşı taraf uygulama indirmeden profilini açar.",
  },
  {
    number: "04",
    title: "Güncelle ve yönet",
    text: "Bilgin değişirse profili güncelle. Kart kaybolursa fiziksel erişimi panelden kapat.",
  },
] as const;

const proofItems = [
  ["Kartın iyzico’da kalır", "Ödeme kartı bilgileri Yenomi’de saklanmaz."],
  ["Anında güncellenir", "Ünvan veya telefon değişince yeniden baskı gerekmez."],
  ["Uygulama gerekmez", "Profil modern tarayıcıda doğrudan açılır."],
  ["Kontrol sende", "Profilini ve fiziksel kart durumunu gerektiğinde yönetirsin."],
];

const heroTrust = [
  "Türkiye içi kargo dahil",
  "2 iş gününde hazırlanır",
  "Uygulama gerekmez",
];

const comparisonRows = [
  ["Bilgilerin değişti", "Yeniden baskı gerekir", "Profili anında güncellersin"],
  ["Paylaşım", "Basılı bilgilerle sınırlı", "NFC + QR + canlı profil"],
  ["Kart kayboldu", "Kontrol sende değildir", "Kayıp moduyla erişimi kapatırsın"],
  ["İletişim kaydı", "Manuel giriş gerekir", "Tek dokunuşla rehbere kaydet"],
];

const faqItems = [
  [
    "Uygulama indirmek gerekiyor mu?",
    "Hayır. Kartı alan kişi NFC ile dokundurduğunda veya QR kodu okuttuğunda profil modern tarayıcıda doğrudan açılır.",
  ],
  [
    "Telefonum veya ünvanım değişirse kartı yeniden bastırır mıyım?",
    "Hayır. Fiziksel kart aynı kalır; canlı profilindeki bilgileri güncellersin. NFC ve QR aynı profile açılmaya devam eder.",
  ],
  [
    "Kartımı kaybedersem ne olur?",
    "Fiziksel kart erişimini panelden kapatabilirsin. Böylece kart kaybolduğunda kontrol sende kalır.",
  ],
  [
    "NFC kullanılmazsa paylaşım nasıl yapılır?",
    "Kart üzerindeki QR kod aynı canlı profile bağlıdır. NFC yerine QR ile de profil açılabilir.",
  ],
  [
    "Ödeme kartı bilgilerim Yenomi’de tutuluyor mu?",
    "Hayır. Ödeme kartı bilgileri Yenomi’de saklanmaz; ödeme iyzico altyapısı üzerinden gerçekleşir.",
  ],
  [
    "Satın alıma ilk yıl platform üyeliği dahil mi?",
    "Evet. NFC kartın tek seferlik ürün bedeline ilk yıl platform üyeliği dahil olarak sunulur.",
  ],
] as const;

export default function HomePage() {
  return (
    <div className="home-mockup home-premium home-premium--hero-v2">
      <main id="main-content">
        <section className={`home-mockup__hero home-premium__hero-v2 ${howItWorks.hero} ${homePolish.heroShell}`} aria-labelledby="home-title">
          <div className={`home-mockup__copy ${homePolish.heroCopy}`}>
            <span className="home-premium__hero-pill"><i aria-hidden="true" /> KAYIP MODU · Kaybolursa kapanır</span>
            <h1 id="home-title">
              Bir kez basılır.<br />
              <span>Her zaman güncel kalır.</span>
            </h1>
            <p>
              Fiziksel NFC + QR kartın canlı dijital kartvizitine bağlanır. Telefonun, ünvanın veya şirketin değiştiğinde
              kartı değil profilini güncellersin.
            </p>

            <div className={`home-mockup__actions home-premium__hero-actions ${homePolish.heroActions}`}>
              <Link className="home-mockup__button home-mockup__button--gold home-mockup__button--primary" href="/urunler/nfc-kart">
                NFC Kartı Satın Al <span aria-hidden>→</span>
              </Link>
              <Link className="home-premium__hero-secondary" href="/kurumsal">
                Kurumsal çözümler <span aria-hidden>→</span>
              </Link>
            </div>

            <div className={`${howItWorks.heroOffer} ${homePolish.heroOffer}`} aria-label="NFC kart başlangıç fiyatı">
              <strong>{initialPrice}</strong>
              <span>Tek seferlik ödeme · 1 yıl platform üyeliği dahil</span>
            </div>

            <div className={`home-premium__hero-trust ${howItWorks.heroTrust} ${homePolish.heroTrust}`} aria-label="Satın alma güvenceleri">
              {heroTrust.map((item) => <span key={item}><i aria-hidden="true">✓</i>{item}</span>)}
            </div>
          </div>

          <div className={`${howItWorks.heroProduct} ${homePolish.heroStage}`} aria-label="Yenomi ID NFC + QR kart ürün görseli">
            <div className={homePolish.stageEyebrow} aria-hidden="true">FİZİKSEL KART · CANLI PROFİL</div>
            <div className={`${howItWorks.heroProductGlow} ${homePolish.heroGlow}`} aria-hidden="true" />
            <Image
              src="/images/nfc-kart-hero.png"
              alt="Yenomi ID NFC ve QR kart ürün görseli"
              width={1350}
              height={1484}
              priority
              sizes="(max-width: 900px) 92vw, 48vw"
              className={`${howItWorks.heroProductImage} ${homePolish.heroProductImage}`}
            />
            <div className={homePolish.capabilities} aria-hidden="true">
              <span>NFC</span>
              <span>QR</span>
              <span>Uygulamasız</span>
            </div>
          </div>
        </section>

        <section className={`${howItWorks.section} ${homePolish.sectionRhythm}`} aria-labelledby="how-it-works-title">
          <div className={howItWorks.heading}>
            <span className="home-mockup__kicker">NASIL ÇALIŞIR</span>
            <h2 id="how-it-works-title">Seç. Oluştur.<br />Paylaş. Yönet.</h2>
            <p>Dört basit adım. Kartını seçtiğin andan günlük kullanıma kadar bütün deneyim tek akışta.</p>
          </div>

          <ol className={`${howItWorks.grid} ${homePolish.stepsGrid}`}>
            {howItWorksSteps.map((step) => (
              <li className={`${howItWorks.step} ${homePolish.step}`} key={step.number}>
                <span className={howItWorks.stepNumber}>Adım {step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>

          <div className={`${howItWorks.productStory} ${homePolish.productStory}`}>
            <div className={howItWorks.productStoryCopy}>
              <span className="home-mockup__kicker">TEK KART · CANLI PROFİL</span>
              <h3>Fiziksel kartın aynı kalır.<br />Dijital kimliğin değişir.</h3>
              <p>NFC ve QR aynı kalıcı profile açılır. Bilgin değiştiğinde yeniden kart bastırmazsın; profilini güncellersin.</p>
              <Link className="home-mockup__link-secondary" href="/nasil-calisir">Detaylı anlatımı gör <span aria-hidden>→</span></Link>
            </div>
            <div className={howItWorks.productStoryVisual} aria-hidden="true">
              <Image
                src="/images/nfc-kart-hero.png"
                alt=""
                width={1350}
                height={1484}
                sizes="(max-width: 900px) 86vw, 38vw"
                className={howItWorks.productStoryImage}
              />
            </div>
          </div>

          <div className={`home-premium__proof ${howItWorks.proofGrid} ${homePolish.proofGrid}`} aria-label="Yenomi ID kullanım güvenceleri">
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
          </div>
        </section>

        <section className={`home-premium__paths ${howItWorks.paths} ${homePolish.sectionRhythm}`} aria-labelledby="paths-title">
          <div className="home-premium__paths-head">
            <span className="home-mockup__kicker">BİREYSEL · KURUMSAL</span>
            <h2 id="paths-title">Aynı sistem.<br />İki ölçek.</h2>
          </div>
          <div className={`home-premium__path-grid ${howItWorks.pathGrid} ${homePolish.pathGrid}`}>
            <article>
              <span>BİREYSEL</span>
              <h3>Tek kart. Her tanışmada güncel.</h3>
              <p>NFC + QR kartın, canlı profilin ve kayıp modun. Bilgilerin değişince yeniden baskı yok.</p>
              <div className={howItWorks.pathMeta}><strong>{initialPrice}</strong><small>1 kart · 1 yıl dahil</small></div>
              <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">NFC Kartı Satın Al <span aria-hidden>→</span></Link>
            </article>
            <article>
              <span>KURUMSAL</span>
              <h3>Ekip aynı standartta tanışır.</h3>
              <p>Çalışan kartları, yetkiler ve görünürlük tek panelde. Ekip büyüdükçe aynı sistemi ölçekle.</p>
              <div className={howItWorks.pathMeta}><strong>Ekip paketleri</strong><small>Merkezi yönetim · rol ve yetki</small></div>
              <Link className="home-mockup__button home-premium__path-secondary" href="/kurumsal">Paketleri Gör <span aria-hidden>→</span></Link>
            </article>
          </div>
        </section>

        <section className={`${howItWorks.comparison} ${homePolish.comparison}`} aria-labelledby="comparison-title">
          <div className={howItWorks.comparisonHead}>
            <span className="home-mockup__kicker">NEDEN YENOMI ID?</span>
            <h2 id="comparison-title">Kartviziti yeniden<br />bastırmayı bırak.</h2>
            <p>Fiziksel kartın aynı kalır. Değişen şey, kontrolünü kaybetmediğin canlı profilindir.</p>
          </div>
          <div className={howItWorks.comparisonTable} role="table" aria-label="Klasik kartvizit ve Yenomi ID karşılaştırması">
            <div className={howItWorks.comparisonHeader} role="row">
              <span role="columnheader">Durum</span>
              <span role="columnheader">Klasik kartvizit</span>
              <span role="columnheader">Yenomi ID</span>
            </div>
            {comparisonRows.map(([label, classic, yenomi]) => (
              <div className={howItWorks.comparisonRow} role="row" key={label}>
                <strong role="cell">{label}</strong>
                <span role="cell">{classic}</span>
                <span role="cell"><i aria-hidden="true">✓</i>{yenomi}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={faqStyles.section} aria-labelledby="faq-title">
          <div className={faqStyles.intro}>
            <span className="home-mockup__kicker">SIK SORULANLAR</span>
            <h2 id="faq-title">Satın almadan önce<br />bilmen gerekenler.</h2>
            <p>Karar vermeyi yavaşlatan temel soruların kısa cevapları.</p>
          </div>
          <div className={faqStyles.list}>
            {faqItems.map(([question, answer], index) => (
              <details className={faqStyles.item} key={question} open={index === 0}>
                <summary>
                  <span>{question}</span>
                  <i aria-hidden="true">+</i>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
          <div className={faqStyles.supportRow}>
            <span>Başka bir sorun mu var?</span>
            <Link href="/destek">Yardım merkezine git <span aria-hidden>→</span></Link>
          </div>
        </section>

        <section className={`home-premium__final ${howItWorks.final} ${homePolish.final}`} aria-labelledby="final-title">
          <span className="home-mockup__kicker">DİJİTAL KARTVİZİT</span>
          <h2 id="final-title">Bir sonraki tanışmada<br />kartvizitin hazır olsun.</h2>
          <p>Kartın bir kez basılsın. Bilgilerin değiştikçe profilin güncel kalsın.</p>
          <div className={howItWorks.finalOffer}>
            <strong>{initialPrice}</strong>
            <span>1 kart · 1 yıl platform üyeliği · Türkiye içi kargo dahil</span>
          </div>
          <div className="home-mockup__actions">
            <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
              NFC Kartı Satın Al <span aria-hidden>→</span>
            </Link>
            <Link className="home-mockup__link-secondary" href="/kurumsal">
              Kurumsal çözümler <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
