import type { Metadata } from "next";
import Link from "next/link";
import { NFC_PRODUCT, formatTryFromKurus } from "../lib/config/product";
import { Icon } from "./icons";
import { YenomiProductVisual } from "./ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "Yenomi ID | Kartvizitin güncel kalsın",
  description: "NFC + QR kartvizit. Unvanın değişince kartı yenilemezsin. Kendin için al, ekibin için aynı standartta yönet. Ödeme iyzico güvencesinde; kart numarası Yenomi’de saklanmaz.",
  alternates: { canonical: "/" },
};

const initialPrice = formatTryFromKurus(NFC_PRODUCT.unitPriceKurus);

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
  ["Kartımı kaybedersem ne olur?", "Fiziksel kart erişimini panelden kapatabilirsin. KAYIP MODU ile kart kaybolduğunda kontrol sende kalır; Kaybolursa kapanır."],
  ["NFC kullanılmazsa paylaşım nasıl yapılır?", "Kart üzerindeki QR kod aynı canlı profile bağlıdır. NFC yerine QR ile de profil açılabilir."],
  ["Ödeme kartı bilgilerim Yenomi’de tutuluyor mu?", "Hayır. Ödeme kartı bilgileri Yenomi’de saklanmaz; Kart numarası Yenomi’de saklanmaz ve ödeme iyzico altyapısı üzerinden gerçekleşir."],
  ["Satın alıma ilk yıl platform üyeliği dahil mi?", "Evet. NFC kartın tek seferlik ürün bedeline ilk yıl platform üyeliği dahil olarak sunulur."],
] as const;

export default function HomePage() {
  return (
    <div className="home-mockup home-premium home-premium--hero-v2">
      <main id="main-content">
        <section className="home-mockup__hero home-premium__hero-v2 home-sales-hero" aria-labelledby="home-title">
          <div className="home-mockup__copy home-sales-copy">
            <span className="home-premium__hero-pill"><i aria-hidden="true" /> Fiziksel NFC + QR DİJİTAL KARTVİZİT</span>
            <h1 id="home-title">Bir kez basılır.<br /><span>Her zaman güncel kalır.</span></h1>
            <p>İletişim bilgilerin değiştiğinde kartını yeniden bastırma. Kartın fiziksel yapısı aynı kalır, dijital profilin güncellenir.</p>
            <div className="home-mockup__actions home-premium__hero-actions home-sales-actions">
              <Link className="home-mockup__button home-mockup__button--gold home-mockup__button--primary" href="/urunler/nfc-kart">
                NFC Kartı Satın Al <span aria-hidden>→</span>
              </Link>
              <Link className="home-premium__hero-secondary" href="#nasil-calisir">
                Nasıl çalıştığını gör <span aria-hidden>↓</span>
              </Link>
            </div>
            <div className="home-sales-offer" aria-label="NFC kart teklif kapsamı">
              <strong>{initialPrice} · 1 yıl dahil</strong>
              <span>Platform üyeliği · Türkiye içi kargo</span>
            </div>
            <div className="home-premium__hero-trust home-sales-trust" aria-label="Satın alma güvenceleri">
              {heroTrust.map((item) => <span key={item}><Icon name="check" />{item}</span>)}
            </div>
          </div>
          <div className="home-sales-stage" aria-label="Yenomi ID NFC + QR kart ürün görseli">
            <div className="home-sales-stage-label" aria-hidden="true">FİZİKSEL KART · CANLI PROFİL</div>
            <div className="home-sales-stage-glow" aria-hidden="true" />
            <div className="home-hero-specimens">
              <YenomiProductVisual variant="card" finish="matte" />
              <YenomiProductVisual variant="profile" compact />
            </div>
            <div className="home-sales-capabilities" aria-hidden="true"><span>NFC</span><span>QR</span><span>Uygulamasız</span></div>
          </div>
        </section>

        <section className="home-premium__proof" aria-labelledby="proof-title">
          <div className="home-premium__proof-head">
            <span className="home-mockup__kicker">GÜVENİLİR VE GİZLİ</span>
            <h2 id="proof-title">Yenomi ID Güvencesi</h2>
            <p>Hesap açmadan ödeyebilirsin. Kart numarası Yenomi’de saklanmaz. Ödeme 256-bit SSL ve iyzico güvencesindedir.</p>
          </div>
          <div className="home-premium__principles">
            <article>
              <span>01</span>
              <div>
                <strong>Hızlı Kargo</strong>
                <p>Kartın 2 iş günü içinde özel ambalajında kargolanır.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <strong>Uygulamasız Kullanım</strong>
                <p>NFC veya QR ile dokundurulduğunda profil anında tarayıcıda açılır.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <strong>Tam Kontrol</strong>
                <p>Bilgilerini dilediğin an güncelle, kaybolursa kartı anında kapat.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="home-premium__paths home-sales-paths" aria-labelledby="paths-title">
          <div className="home-premium__paths-head">
            <span className="home-mockup__kicker">BİREYSEL · KURUMSAL</span>
            <h2 id="paths-title">Aynı sistem.<br />İki ölçek.</h2>
          </div>
          <div className="home-premium__path-grid">
            <article>
              <span>BİREYSEL</span>
              <h3>Tek kart. Her tanışmada güncel.</h3>
              <p>Fiziksel NFC + QR kartın, canlı profilin ve KAYIP MODU. Kartın fiziksel bilgisi değişse bile yeniden baskı yok. Kaybolursa kapanır.</p>
              <div className="home-sales-path-meta"><strong>{initialPrice}</strong><small>1 kart · 1 yıl dahil</small></div>
              <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
                NFC Kartı Satın Al <span aria-hidden>→</span>
              </Link>
            </article>
            <article>
              <span>KURUMSAL</span>
              <h3>Ekibin dijital kimliğini tek yerden yönet.</h3>
              <p>Yeni çalışanı yayınla, bilgileri güncelle, ayrılan personelin kartını kapat. Kurumsal standardı ekip genelinde koru.</p>
              <div className="home-sales-path-meta"><strong>Ekip paketleri</strong><small>Merkezi yönetim · rol ve yetki</small></div>
              <Link className="home-mockup__button home-premium__path-secondary" href="/kurumsal">
                Kurumsal Çözümleri Gör <span aria-hidden>→</span>
              </Link>
            </article>
          </div>
        </section>

        <section id="nasil-calisir" className="home-premium__journey" aria-labelledby="how-it-works-title">
          <div className="home-premium__journey-head">
            <span className="home-mockup__kicker">NASIL ÇALIŞIR</span>
            <h2 id="how-it-works-title">Seç. Oluştur.<br />Paylaş. Yönet.</h2>
            <p>Kartını seçtiğin andan günlük kullanıma kadar tek akış.</p>
          </div>
          <ol className="home-premium__journey-steps">
            <li>
              <span>01</span>
              <div>
                <h3>Kartını seç</h3>
                <p>Fiziksel NFC + QR kartını seç. Kartın tek bir kalıcı dijital profile bağlanır.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Profilini oluştur</h3>
                <p>İletişim bilgilerini, ünvanını ve bağlantılarını tek profilde topla.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Dokundur veya okut</h3>
                <p>NFC ile yaklaştır veya QR’ı okut. KAYIP MODU sayesinde Kaybolursa kapanır.</p>
              </div>
            </li>
          </ol>
          <div className="home-premium__journey-action">
            <p>Tüm adımları ve özellikleri incelemek için: <strong><Link href="/nasil-calisir">Nasıl Çalışır sayfasını ziyaret et →</Link></strong></p>
          </div>
        </section>

        <section className="home-sales-comparison" aria-labelledby="comparison-title">
          <div className="home-sales-comparison-head">
            <span className="home-mockup__kicker">NEDEN YENOMI ID?</span>
            <h2 id="comparison-title">Kartviziti yeniden<br />bastırmayı bırak.</h2>
            <p>Fiziksel kart aynı kalır. Değişen bilgiyi canlı profilden yönetirsin.</p>
          </div>
          <div className="home-sales-comparison-table" role="table" aria-label="Klasik kartvizit ve Yenomi ID karşılaştırması">
            <div className="home-sales-comparison-header" role="row"><span role="columnheader">Durum</span><span role="columnheader">Klasik kartvizit</span><span role="columnheader">Yenomi ID</span></div>
            {comparisonRows.map(([label, classic, yenomi]) => (
              <div className="home-sales-comparison-row" role="row" key={label}>
                <strong role="cell">{label}</strong>
                <span role="cell">{classic}</span>
                <span role="cell"><Icon name="check" />{yenomi}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="home-sales-faq" aria-labelledby="faq-title">
          <div className="home-sales-faq-intro">
            <span className="home-mockup__kicker">SIK SORULANLAR</span>
            <h2 id="faq-title">Satın almadan önce<br />bilmen gerekenler.</h2>
          </div>
          <div className="home-sales-faq-list">
            {faqItems.map(([question, answer], index) => (
              <details className="home-sales-faq-item" key={question} open={index === 0}>
                <summary><span>{question}</span><i aria-hidden="true">+</i></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
          <div className="home-sales-support">
            <span>Başka bir sorun mu var?</span>
            <Link href="/destek">Yardım merkezine git <span aria-hidden>→</span></Link>
          </div>
        </section>

        <section className="home-premium__final home-sales-final" aria-labelledby="final-title">
          <span className="home-mockup__kicker">DİJİTAL KARTVİZİT</span>
          <h2 id="final-title">Bir sonraki tanışmada<br />kartvizitin hazır olsun.</h2>
          <p>Kartın bir kez basılsın. Bilgilerin değiştikçe profilin güncel kalsın. Hesap açmadan ödeyebilirsin. Kart numarası Yenomi’de saklanmaz.</p>
          <div className="home-sales-final-offer">
            <strong>{initialPrice}</strong>
            <span>1 kart · 1 yıl platform üyeliği · Türkiye içi kargo dahil</span>
          </div>
          <div className="home-mockup__actions">
            <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
              NFC Kartı Satın Al <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      </main>

      <aside className="home-sales-mobile-cta" aria-label="NFC kart hızlı satın alma">
        <div className="home-sales-mobile-cta__offer">
          <strong>{initialPrice}</strong>
          <span>1 yıl dahil</span>
        </div>
        <Link className="home-mockup__button home-mockup__button--gold" href="/urunler/nfc-kart">
          NFC Kartı Satın Al <span aria-hidden>→</span>
        </Link>
      </aside>
    </div>
  );
}