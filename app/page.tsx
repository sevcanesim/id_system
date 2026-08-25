import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { NFC_PRODUCT, formatTryFromKurus } from "../lib/config/product";
import { Icon } from "./icons";

export const metadata: Metadata = {
  title: "Yenomi ID | Kartvizitin güncel kalsın",
  description: "NFC + QR kartvizit. Unvanın değişince kartı yenilemezsin. Kendin için al, ekibin için aynı standartta yönet. Ödeme iyzico güvencesinde; kart numarası Yenomi’de saklanmaz.",
  alternates: { canonical: "/" },
};

const initialPrice = formatTryFromKurus(NFC_PRODUCT.unitPriceKurus);

const howItWorksSteps = [
  { number: "01", title: "Kartını seç", text: "NFC + QR kartını seç. Kartın tek bir kalıcı dijital profile bağlanır." },
  { number: "02", title: "Profilini oluştur", text: "İletişim bilgilerini, ünvanını ve bağlantılarını tek profilde topla." },
  { number: "03", title: "Dokundur veya okut", text: "NFC ile yaklaştır veya QR’ı okut. Profil uygulama indirmeden açılır." },
  { number: "04", title: "Güncelle ve yönet", text: "Bilgin değişirse profili güncelle. Kart kaybolursa fiziksel erişimi kapat." },
] as const;

const heroTrust = ["Türkiye içi kargo dahil", "2 iş gününde hazırlanır", "Uygulama gerekmez"];

const comparisonRows = [
  ["Bilgilerin değişti", "Yeniden baskı gerekir", "Profili anında güncellersin"],
  ["Paylaşım", "Basılı bilgilerle sınırlı", "NFC + QR + canlı profil"],
  ["Kart kayboldu", "Kontrol sende değildir", "Kayıp moduyla erişimi kapatırsın"],
  ["İletişim kaydı", "Manuel giriş gerekir", "Tek dokunuşla rehbere kaydet"],
] as const;

const faqItems = [
  ["Uygulama indirmek gerekiyor mu?", "Hayır. Kartı alan kişi NFC ile dokundurduğunda veya QR kodu okuttuğunda profil modern tarayıcıda doğrudan açılır."],
  ["Telefonum veya ünvanım değişirse kartı yeniden bastırır mıyım?", "Hayır. Fiziksel kart aynı kalır; canlı profilindeki bilgileri güncellersin. NFC ve QR aynı profile açılmaya devam eder."],
  ["Kartımı kaybedersem ne olur?", "Fiziksel kart erişimini panelden kapatabilirsin. Böylece kart kaybolduğunda kontrol sende kalır."],
  ["NFC kullanılmazsa paylaşım nasıl yapılır?", "Kart üzerindeki QR kod aynı canlı profile bağlıdır. NFC yerine QR ile de profil açılabilir."],
  ["Ödeme kartı bilgilerim Yenomi’de tutuluyor mu?", "Hayır. Ödeme kartı bilgileri Yenomi’de saklanmaz; ödeme iyzico altyapısı üzerinden gerçekleşir."],
  ["Satın alıma ilk yıl platform üyeliği dahil mi?", "Evet. NFC kartın tek seferlik ürün bedeline ilk yıl platform üyeliği dahil olarak sunulur."],
] as const;

export default function HomePage() {
  return (
    <div className="home-mockup home-premium home-premium--hero-v2">
      <main id="main-content">
        <section className="home-mockup__hero home-premium__hero-v2 home-sales-hero" aria-labelledby="home-title">
          <div className="home-mockup__copy home-sales-copy">
            <span className="home-premium__hero-pill"><i aria-hidden="true" /> NFC + QR DİJİTAL KARTVİZİT</span>
            <h1 id="home-title">Bir kez basılır.<br /><span>Her zaman güncel kalır.</span></h1>
            <p>İletişim bilgilerin değiştiğinde kartını yeniden bastırma. NFC + QR kartın aynı kalır, dijital profilin güncellenir.</p>
            <div className="home-mockup__actions home-premium__hero-actions home-sales-actions">
              <Link className="home-mockup__button home-mockup__button--gold home-mockup__button--primary" href="/urunler/nfc-kart">NFC Kartımı Al <span aria-hidden>→</span></Link>
              <Link className="home-premium__hero-secondary" href="#nasil-calisir">Nasıl çalıştığını gör <span aria-hidden>↓</span></Link>
            </div>
            <div className="home-sales-offer" aria-label="NFC kart teklif kapsamı"><strong>{initialPrice} · 1 yıl dahil</strong><span>Platform üyeliği · Türkiye içi kargo</span></div>
            <div className="home-premium__hero-trust home-sales-trust" aria-label="Satın alma güvenceleri">
              {heroTrust.map((item) => <span key={item}><Icon name="check" />{item}</span>)}
            </div>
          </div>
          <div className="home-sales-stage" aria-label="Yenomi ID NFC + QR kart ürün görseli">
            <div className="home-sales-stage-label" aria-hidden="true">FİZİKSEL KART · CANLI PROFİL</div>
            <div className="home-sales-stage-glow" aria-hidden="true" />
            <Image src="/images/nfc-kart-hero.png" alt="Yenomi ID NFC ve QR kart ürün görseli" width={1350} height={1484} priority sizes="(max-width: 900px) 92vw, 48vw" className="home-sales-product" />
            <div className="home-sales-capabilities" aria-hidden="true"><span>NFC</span><span>QR</span><span>Uygulamasız</span></div>
          </div>
        </section>

        <section id="nasil-calisir" className="home-sales-section" aria-labelledby="how-it-works-title">
          <div className="home-sales-heading">
            <span className="home-mockup__kicker">NASIL ÇALIŞIR</span>
            <h2 id="how-it-works-title">Seç. Oluştur.<br />Paylaş. Yönet.</h2>
            <p>Kartını seçtiğin andan günlük kullanıma kadar tek akış.</p>
          </div>
          <ol className="home-sales-steps">
            {howItWorksSteps.map((step) => <li className="home-sales-step" key={step.number}><span className="home-sales-step-number">Adım {step.number}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}
          </ol>
        </section>

        <section className="home-premium__paths home-sales-paths" aria-labelledby="paths-title">
          <div className="home-premium__paths-head"><span className="home-mockup__kicker">BİREYSEL · KURUMSAL</span><h2 id="paths-title">Aynı sistem.<br />İki ölçek.</h2></div>
          <div className="home-premium__path-grid">
            <article><span>BİREYSEL</span><h3>Tek kart. Her tanışmada güncel.</h3><p>NFC + QR kartın, canlı profilin ve kayıp modun. Bilgilerin değişince yeniden baskı yok.</p><div className="home-sales-path-meta"><strong>{initialPrice}</strong><small>1 kart · 1 yıl dahil</small></div><Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">NFC Kartımı Al <span aria-hidden>→</span></Link></article>
            <article><span>KURUMSAL</span><h3>Ekibin dijital kimliğini tek yerden yönet.</h3><p>Yeni çalışanı yayınla, bilgileri güncelle, ayrılan personelin kartını kapat. Kurumsal standardı ekip genelinde koru.</p><div className="home-sales-path-meta"><strong>Ekip paketleri</strong><small>Merkezi yönetim · rol ve yetki</small></div><Link className="home-mockup__button home-premium__path-secondary" href="/kurumsal">Kurumsal Çözümleri Gör <span aria-hidden>→</span></Link></article>
          </div>
        </section>

        <section className="home-sales-comparison" aria-labelledby="comparison-title">
          <div className="home-sales-comparison-head"><span className="home-mockup__kicker">NEDEN YENOMI ID?</span><h2 id="comparison-title">Kartviziti yeniden<br />bastırmayı bırak.</h2><p>Fiziksel kart aynı kalır. Değişen bilgiyi canlı profilden yönetirsin.</p></div>
          <div className="home-sales-comparison-table" role="table" aria-label="Klasik kartvizit ve Yenomi ID karşılaştırması">
            <div className="home-sales-comparison-header" role="row"><span role="columnheader">Durum</span><span role="columnheader">Klasik kartvizit</span><span role="columnheader">Yenomi ID</span></div>
            {comparisonRows.map(([label, classic, yenomi]) => <div className="home-sales-comparison-row" role="row" key={label}><strong role="cell">{label}</strong><span role="cell">{classic}</span><span role="cell"><Icon name="check" />{yenomi}</span></div>)}
          </div>
        </section>

        <section className="home-sales-faq" aria-labelledby="faq-title">
          <div className="home-sales-faq-intro"><span className="home-mockup__kicker">SIK SORULANLAR</span><h2 id="faq-title">Satın almadan önce<br />bilmen gerekenler.</h2></div>
          <div className="home-sales-faq-list">
            {faqItems.map(([question, answer], index) => <details className="home-sales-faq-item" key={question} open={index === 0}><summary><span>{question}</span><i aria-hidden="true">+</i></summary><p>{answer}</p></details>)}
          </div>
          <div className="home-sales-support"><span>Başka bir sorun mu var?</span><Link href="/destek">Yardım merkezine git <span aria-hidden>→</span></Link></div>
        </section>

        <section className="home-premium__final home-sales-final" aria-labelledby="final-title">
          <span className="home-mockup__kicker">DİJİTAL KARTVİZİT</span>
          <h2 id="final-title">Bir sonraki tanışmada<br />kartvizitin hazır olsun.</h2>
          <p>Kartın bir kez basılsın. Bilgilerin değiştikçe profilin güncel kalsın.</p>
          <div className="home-sales-final-offer"><strong>{initialPrice}</strong><span>1 kart · 1 yıl platform üyeliği · Türkiye içi kargo dahil</span></div>
          <div className="home-mockup__actions"><Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">NFC Kartımı Al <span aria-hidden>→</span></Link></div>
        </section>
      </main>

      <style>{`
        .home-sales-mobile-cta { display: none; }
        @media (max-width: 640px) {
          .home-mockup { padding-bottom: calc(84px + env(safe-area-inset-bottom)); }
          .home-sales-mobile-cta {
            position: fixed;
            z-index: 70;
            left: 12px;
            right: 12px;
            bottom: calc(10px + env(safe-area-inset-bottom));
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: 12px;
            padding: 10px 10px 10px 14px;
            border: 1px solid var(--border-subdued);
            border-radius: var(--radius-md);
            background: rgba(255, 255, 255, .94);
            box-shadow: 0 14px 40px rgba(35, 29, 22, .16);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
          }
          .home-sales-mobile-cta__offer {
            min-width: 0;
            display: grid;
            gap: 2px;
          }
          .home-sales-mobile-cta__offer strong {
            color: var(--text-primary);
            font-size: var(--type-body);
            line-height: 1.1;
            letter-spacing: -.02em;
          }
          .home-sales-mobile-cta__offer span {
            color: var(--text-secondary);
            font-size: var(--type-xs);
          }
          .home-sales-mobile-cta .home-mockup__button {
            min-height: 48px;
            width: 100%;
            padding-inline: 14px;
            white-space: nowrap;
          }
          .home-sales-mobile-cta .home-mockup__button:focus-visible {
            outline: 2px solid var(--brand-gold-deep);
            outline-offset: 3px;
          }
        }
      `}</style>
      <aside className="home-sales-mobile-cta" aria-label="NFC kart hızlı satın alma">
        <div className="home-sales-mobile-cta__offer">
          <strong>{initialPrice}</strong>
          <span>1 yıl dahil</span>
        </div>
        <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">NFC Kartımı Al <span aria-hidden>→</span></Link>
      </aside>
    </div>
  );
}
