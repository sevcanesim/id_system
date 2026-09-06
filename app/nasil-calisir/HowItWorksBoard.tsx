import Link from "next/link";
import { Icon, type IconName } from "../icons";
import { YenomiProductVisual } from "../ui/YenomiProductVisual";
import { INDIVIDUAL_PREMIUM_PLAN } from "../../lib/commerce/packages";
import { formatTryFromKurus } from "../../lib/config/product";

const steps: Array<{ number: string; title: string; text: string; icon: IconName }> = [
  { number: "01", title: "Kartınızı seçin", text: "Bireysel NFC veya Bireysel Premium’u seçin. Fiziksel kartınız tek, kalıcı dijital kimliğinize bağlanır.", icon: "nfc" },
  { number: "02", title: "Kimliğinizi kurun", text: "İletişim bilgilerinizi, bağlantılarınızı, toplantı ve sunum içeriklerinizi tek profilde yönetin.", icon: "id" },
  { number: "03", title: "Dokundurun veya okutun", text: "Karşı taraf NFC veya QR ile profilinizi uygulama indirmeden doğrudan tarayıcıda açar.", icon: "qr" },
  { number: "04", title: "Bağlantıyı ilerletin", text: "Bireysel Premium’da kişileri kaydedin, Network Mail ile takip edin; kart kaybolursa erişimi panelden kapatın.", icon: "mail" },
];

const premiumBenefits: Array<{ title: string; text: string; icon: IconName }> = [
  { title: "NFC + QR kart", text: "Tek fiziksel kart, kalıcı bağlantı ve canlı dijital kimlik.", icon: "nfc" },
  { title: "Kişi yönetimi", text: "Tanıştığınız kişileri kartvizit akışından kaydedin ve düzenleyin.", icon: "id" },
  { title: "Toplantı & sunum", text: "Profesyonel içeriklerinizi profilinizden tek noktada paylaşın.", icon: "link" },
  { title: "100 Network Mail", text: "Tanışma sonrasındaki profesyonel takip e-postalarını gönderin.", icon: "mail" },
];

export function HowItWorksBoard() {
  const premiumPrice = formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus);

  return (
    <main id="main-content" className="how-simple-page">
      <section className="how-simple-hero" aria-labelledby="how-title">
        <div className="yi-container how-simple-hero__grid">
          <div className="how-simple-hero__copy">
            <span className="section-kicker">BİREYSEL PREMIUM NASIL ÇALIŞIR?</span>
            <h1 id="how-title">Kimliğinizi paylaşın.<br />Bağlantıyı ilerletin.</h1>
            <p>Yenomi ID Bireysel Premium, fiziksel NFC + QR kartınızı canlı profil, kişi yönetimi ve takip araçlarıyla tek bir deneyimde birleştirir.</p>
            <div className="how-simple-hero__offer">
              <strong>{premiumPrice}</strong>
              <span>1 yıl · NFC + QR · 100 Network Mail · Türkiye içi kargo</span>
            </div>
            <div className="how-simple-actions">
              <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart?paket=premium">Premium deneyimi seç →</Link>
              <Link className="how-simple-text-link" href="#adimlar">Deneyimi adım adım görün ↓</Link>
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
            <h2 id="steps-title">Karttan tanışma sonrasına tek, net akış.</h2>
            <p>Kurulum karmaşası ve uygulama indirme zorunluluğu yok. Kimliğinizi kurun, paylaşın ve bağlantıyı kendi ritminizde sürdürün.</p>
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
            <h2 id="premium-title">Kartvizitten sonra da akılda kalmak için.</h2>
            <p>Bireysel NFC paylaşımı çözer. Bireysel Premium, paylaşım sonrasında başlayan bağlantı ve takip akışını da Yenomi ID içinde tutar.</p>
            <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart?paket=premium">Premium’u keşfet →</Link>
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
            <h2 id="control-title">Bilginiz değişir. Kartınız değişmez.</h2>
            <p>Unvanınızı, telefonunuzu veya bağlantılarınızı profilinizden güncelleyin. Kart kaybolursa fiziksel erişimi kapatın. NFC ve QR aynı kalıcı kimliğe bağlı kalır.</p>
          </div>
          <div className="how-simple-control__facts">
            <span><Icon name="refresh" /><strong>Anında güncelleyin</strong><small>Yeniden baskı gerekmez</small></span>
            <span><Icon name="lock" /><strong>Kayıp modu</strong><small>Fiziksel erişimi kapatın</small></span>
            <span><Icon name="shield" /><strong>Güvenli ödeme</strong><small>Kart numarası Yenomi’de tutulmaz</small></span>
          </div>
        </div>
      </section>

      <section className="how-simple-final" aria-labelledby="how-final-title">
        <div className="yi-container how-simple-final__inner">
          <div>
            <span className="section-kicker">BİREYSEL PREMIUM</span>
            <h2 id="how-final-title">Bir sonraki tanışmanızın devamı sizde olsun.</h2>
            <p>NFC + QR kart, canlı profil, kişi yönetimi, toplantı, sunum ve 100 Network Mail tek pakette.</p>
          </div>
          <div className="how-simple-final__buy">
            <strong>{premiumPrice}</strong>
            <span>1 yıl dahil</span>
            <Link className="yi-btn yi-btn--primary" href="/urunler/nfc-kart?paket=premium">Premium deneyimi seç →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
