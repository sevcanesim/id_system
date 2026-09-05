import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";
import { INDIVIDUAL_PREMIUM_PLAN } from "../../lib/commerce/packages";
import { formatTryFromKurus } from "../../lib/config/product";

const steps: Array<{ number: string; title: string; text: string; icon: IconName }> = [
  { number: "01", title: "Seviyeni seç", text: "Bireysel NFC veya Bireysel Premium’u seç. Fiziksel kartın tek bir kalıcı dijital profile bağlanır.", icon: "nfc" },
  { number: "02", title: "Profilini oluştur", text: "İletişim bilgilerini, bağlantılarını, toplantı ve sunum içeriklerini tek profilde yönet.", icon: "id" },
  { number: "03", title: "Dokundur veya okut", text: "Karşı taraf NFC veya QR ile profilini uygulama indirmeden doğrudan tarayıcıda açar.", icon: "qr" },
  { number: "04", title: "Bağlantıyı ilerlet", text: "Bireysel Premium’da kişiyi kaydet, Network Mail ile takip et; kart kaybolursa erişimi panelden kapat.", icon: "mail" },
];

const premiumBenefits: Array<{ title: string; text: string; icon: IconName }> = [
  { title: "NFC + QR kart", text: "Tek fiziksel kart, değişmeyen bağlantı ve canlı dijital profil.", icon: "nfc" },
  { title: "Kişi yönetimi", text: "Tanıştığın kişileri kartvizit akışından kaydet ve düzenle.", icon: "id" },
  { title: "Toplantı & sunum", text: "Profesyonel içeriklerini profilinden tek noktada paylaş.", icon: "link" },
  { title: "100 Network Mail", text: "Tanışma sonrasındaki profesyonel takip e-postalarını gönder.", icon: "mail" },
];

export function HowItWorksBoard() {
  const premiumPrice = formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus);

  return (
    <main id="main-content" className="how-simple-page">
      <section className="how-simple-hero" aria-labelledby="how-title">
        <div className="yi-container how-simple-hero__grid">
          <div className="how-simple-hero__copy">
            <span className="section-kicker">BİREYSEL PREMIUM NASIL ÇALIŞIR?</span>
            <h1 id="how-title">Kartını paylaş.<br />Bağlantıyı ilerlet.</h1>
            <p>Yenomi ID Bireysel Premium, fiziksel NFC + QR kartını canlı profil, kişi yönetimi ve takip araçlarıyla tek akışta birleştirir.</p>
            <div className="how-simple-hero__offer">
              <strong>{premiumPrice}</strong>
              <span>1 yıl · NFC + QR · 100 Network Mail · Türkiye içi kargo</span>
            </div>
            <div className="how-simple-actions">
              <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart?paket=premium">Bireysel Premium’u Seç →</Link>
              <Link className="how-simple-text-link" href="#adimlar">Akışı adım adım gör ↓</Link>
            </div>
          </div>
          <div className="how-simple-hero__visual" aria-label="Bireysel Premium ürün görünümü">
            <div className="how-simple-visual-label">BİREYSEL PREMIUM · NFC + QR · CANLI PROFİL</div>
            <YenomiProductVisual variant="card" finish="matte" />
            <div className="how-simple-visual-chips" aria-hidden="true"><span>NFC</span><span>QR</span><span>Network Mail</span></div>
          </div>
        </div>
      </section>

      <section id="adimlar" className="how-simple-steps" aria-labelledby="steps-title">
        <div className="yi-container">
          <header className="how-simple-section-head">
            <span className="section-kicker">4 ADIMDA YENOMI ID</span>
            <h2 id="steps-title">Karttan tanışma sonrasına tek akış.</h2>
            <p>Kurulum karmaşası veya uygulama indirme zorunluluğu yok. Kartını oluştur, paylaş ve bağlantıyı kendi ritminde sürdür.</p>
          </header>
          <ol className="how-simple-step-list">
            {steps.map((step) => (
              <li key={step.number}>
                <div className="how-simple-step-number">{step.number}</div>
                <div className="how-simple-step-icon"><Icon name={step.icon} /></div>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="how-simple-premium" aria-labelledby="premium-title">
        <div className="yi-container how-simple-premium__grid">
          <div className="how-simple-premium__intro">
            <span className="section-kicker">NEDEN BİREYSEL PREMIUM?</span>
            <h2 id="premium-title">Kartvizitten sonra da görünür kalmak için.</h2>
            <p>Bireysel NFC paylaşımı çözer. Bireysel Premium, paylaşım sonrasında başlayan bağlantı ve takip akışını da Yenomi ID içinde tutar.</p>
            <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart?paket=premium">Bireysel Premium’u İncele →</Link>
          </div>
          <div className="how-simple-benefits">
            {premiumBenefits.map((benefit) => (
              <article key={benefit.title}>
                <Icon name={benefit.icon} />
                <div><h3>{benefit.title}</h3><p>{benefit.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="how-simple-control" aria-labelledby="control-title">
        <div className="yi-container how-simple-control__inner">
          <div>
            <span className="section-kicker">KONTROL SENDE</span>
            <h2 id="control-title">Bilgin değişir. Kartın değişmez.</h2>
            <p>Unvanını, telefonunu veya bağlantılarını profilden güncelle. Kart kaybolursa fiziksel erişimi kapat. NFC ve QR aynı kalıcı kimliğe bağlı kalır.</p>
          </div>
          <div className="how-simple-control__facts">
            <span><Icon name="refresh" /><strong>Anında güncelle</strong><small>Yeniden baskı gerekmez</small></span>
            <span><Icon name="lock" /><strong>Kayıp modu</strong><small>Fiziksel erişimi durdur</small></span>
            <span><Icon name="shield" /><strong>Güvenli ödeme</strong><small>Kart numarası Yenomi’de tutulmaz</small></span>
          </div>
        </div>
      </section>

      <section className="how-simple-final" aria-labelledby="how-final-title">
        <div className="yi-container how-simple-final__inner">
          <div>
            <span className="section-kicker">BİREYSEL PREMIUM</span>
            <h2 id="how-final-title">Bir sonraki tanışmanın devamı sende olsun.</h2>
            <p>NFC + QR kart, canlı profil, kişi yönetimi, toplantı, sunum ve 100 Network Mail tek pakette.</p>
          </div>
          <div className="how-simple-final__buy">
            <strong>{premiumPrice}</strong>
            <span>1 yıl dahil</span>
            <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart?paket=premium">Bireysel Premium’u Seç →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
