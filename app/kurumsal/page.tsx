import { Icon } from "../icons";
import AddToCartButton from "../components/AddToCartButton";
import {
  CORPORATE_PACKAGE_LADDER,
  CORPORATE_PACKAGE_PRODUCT_SLUG,
  NETWORK_MAIL_CREDIT_PACKS,
  NETWORK_MAIL_POSITIONING,
  corporateCheckoutLive,
  corporatePackageSku,
  networkMailGrant,
  perSeatKurus,
} from "../../lib/commerce/packages";
import { formatTryFromKurus } from "../../lib/config/product";
import CorporateLeadForm from "./CorporateLeadForm";

const outcomes = [
  { value: "Tek panel", label: "Çalışan, kart ve profil yönetimi" },
  { value: "Anında", label: "Bilgi güncelleme ve kart kapatma" },
  { value: "Tek standart", label: "Tüm ekipte kurumsal görünüm" },
];

const analytics = [
  { value: "30 gün", title: "Güncel görüntülenme", text: "Ekibinizin kartlarının son 30 gündeki toplam erişimini tek bakışta izleyin." },
  { value: "Toplam", title: "Birikimli performans", text: "Kurumsal kartların yayına alındığı günden itibaren oluşan toplam görüntülenmeyi görün." },
  { value: "Kart bazında", title: "Ekip karşılaştırması", text: "Hangi çalışan kartlarının daha fazla görüntülendiğini karşılaştırın." },
  { value: "Ülke bazında", title: "Erişim dağılımı", text: "Kart etkileşimlerinin ülkelere göre dağılımını kurumsal panelden takip edin." },
];

const useCases = [
  { icon: "users" as const, title: "Satış ve saha ekipleri", text: "Her çalışan aynı kurumsal standartla tanışır; telefon, e-posta, katalog ve teklif bağlantılarını tek profilde paylaşır." },
  { icon: "building" as const, title: "İK ve yönetim", text: "Yeni çalışanı ekleyin, ünvan ve departmanı güncelleyin; ayrılan personelin kartını yeniden baskı beklemeden kapatın." },
  { icon: "shield" as const, title: "Marka ve veri kontrolü", text: "Logo, renk, bağlantı ve görünürlük kurallarını merkezden yönetin. Dağınık ve eski kartvizitleri ortadan kaldırın." },
];

const steps = [
  ["01", "İhtiyacı belirleyelim", "Çalışan sayısı, ekip yapısı ve kart şablonunuzu birlikte netleştiririz."],
  ["02", "Kurumsal yapıyı kuralım", "Logo, renk, alanlar ve yetkiler tanımlanır; çalışan listesi toplu olarak sisteme alınır."],
  ["03", "Kartları teslim edelim", "NFC + QR kartlar üretilir, profiller eşleştirilir ve yönetim paneliniz kullanıma açılır."],
];

const managementProof = [
  ["Yeni çalışan", "Profili oluştur, kartı ata ve kullanıma aç."],
  ["Bilgi değişikliği", "Ünvan, telefon ve bağlantıları yeniden baskı olmadan güncelle."],
  ["Ayrılan çalışan", "Kartı ve erişimi merkezden kapat."],
] as const;

export default async function CorporatePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;

  return (
    <main id="main-content" className="theme-light corporate-page corporate-sales-page corporate-single-page">
      <section className="corporate-single-hero corporate-authentic-hero" aria-labelledby="corporate-single-title">
        <div className="corporate-single-copy">
          <span className="section-kicker">YENOMI BUSINESS</span>
          <h1 id="corporate-single-title">
            <span className="corporate-hero-line">Ekibinizin dijital kimliğini tek yerden yönetin.</span>
            <span className="corporate-hero-line corporate-hero-line--accent">Yeniden baskıyı ve dağınık kartvizit yönetimini azaltın.</span>
          </h1>
          <p>Yeni çalışanı yayınlayın, bilgileri güncelleyin ve ayrılan personelin kartını kapatın. Tüm kurumsal hesaplar aynı yönetim panelini kullanır; yalnızca ekip kapasitesi ve fiziksel kart adedi ihtiyaca göre değişir.</p>
          <div className="corporate-hero-actions">
            <a href="#business-pricing-title" className="corporate-cta">Kapasite ve Fiyatları Gör <span aria-hidden="true">→</span></a>
            <a href="/kurumsal?plan=ENTERPRISE#teklif" className="home-mockup__link-secondary">100+ Kişi İçin Teklif Al <span aria-hidden="true">→</span></a>
          </div>
        </div>

        <aside className="corporate-authentic-proof" aria-label="Yenomi ID kurumsal yönetim kapsamı">
          <div className="corporate-authentic-proof__head">
            <span>MERKEZİ YÖNETİM</span>
            <strong>Günlük çalışan hareketlerini tek panelden yönetin.</strong>
          </div>
          <div className="corporate-authentic-proof__list">
            {managementProof.map(([title, text], index) => (
              <div key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><strong>{title}</strong><p>{text}</p></div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="corporate-authentic-outcomes" aria-label="Kurumsal ürün sonuçları">
        {outcomes.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
      </section>

      <section className="corporate-pricing-section corporate-single-details" aria-labelledby="business-pricing-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">YILLIK KURUMSAL SİSTEM</span>
          <h2 id="business-pricing-title">Tek panel, ekip büyüklüğüne göre kapasite.</h2>
          <p>Tüm kurumsal hesaplarda aynı yönetim deneyimi kullanılır. Aşağıdaki seçenekler özellik seviyesi değil; yalnızca kullanıcı, NFC kart ve yıllık kapasite farkını gösterir.</p>
        </div>
        <details className="corporate-pack-details" open>
          <summary>Kapasite ve yıllık fiyatlar</summary>
          <div className="corporate-pack-table-wrap">
            <table className="corporate-pack-table">
              <caption className="sr-only">Kurumsal kapasite ve fiyat listesi</caption>
              <thead>
                <tr>
                  <th scope="col">Kapasite</th>
                  <th scope="col">Kullanıcı</th>
                  <th scope="col">NFC kart</th>
                  <th scope="col">Network Mail</th>
                  <th scope="col">Kişi başı</th>
                  <th scope="col">Yıllık fiyat</th>
                  <th scope="col"><span className="sr-only">Aksiyon</span></th>
                </tr>
              </thead>
              <tbody>
                {CORPORATE_PACKAGE_LADDER.map((plan) => (
                  <tr key={plan.code}>
                    <th scope="row">{plan.seats} kişilik</th>
                    <td className="is-num">{plan.seats}</td>
                    <td className="is-num">{plan.seats}</td>
                    <td className="is-num">{networkMailGrant(plan.seats).toLocaleString("tr-TR")}</td>
                    <td className="is-num">{formatTryFromKurus(perSeatKurus(plan.priceKurus, plan.seats))}</td>
                    <td className="is-num"><strong>{formatTryFromKurus(plan.priceKurus)}</strong></td>
                    <td className="is-action">
                      {corporateCheckoutLive(plan.seats) ? (
                        <AddToCartButton
                          productId={CORPORATE_PACKAGE_PRODUCT_SLUG}
                          variantSku={corporatePackageSku(plan.code)}
                          kind="BUSINESS_CARD"
                          name={plan.name}
                          unitPriceKurus={plan.priceKurus}
                          label="Sepete Ekle"
                          appearance="secondary"
                          className="corporate-plan-text"
                          configuration={{ packageCode: plan.code, seatCount: plan.seats }}
                        />
                      ) : (
                        <a href={`/kurumsal?plan=${plan.code}#teklif`} className="corporate-plan-text">Teklif Al</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="corporate-pack-note">1 yıllık kullanım, seçilen kullanıcı sayısı kadar NFC kart ve Türkiye içi ücretsiz kargo dahildir. Panel özellikleri kurumsal hesaplar arasında değişmez; yalnızca kapasite ekip büyüklüğüne göre seçilir.</p>
        <div className="corporate-addon-grid corporate-mail-packs">
          <article>
            <span>NETWORK MAIL</span>
            <h3>{NETWORK_MAIL_POSITIONING.name}</h3>
            <p>{NETWORK_MAIL_POSITIONING.promise} {NETWORK_MAIL_POSITIONING.unit}. {NETWORK_MAIL_POSITIONING.notBulk}</p>
            <ul>
              {NETWORK_MAIL_CREDIT_PACKS.map((pack) => (
                <li key={pack.sku}><b>{pack.credits.toLocaleString("tr-TR")} kredi</b> {formatTryFromKurus(pack.priceKurus)}</li>
              ))}
            </ul>
            <a href="/kurumsal?plan=NETWORK-MAIL#teklif" className="home-mockup__link-secondary">Network Mail için Teklif Al <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </section>

      <section className="corporate-lead-section" id="teklif" aria-labelledby="corporate-lead-title">
        <div className="corporate-lead-copy">
          <span className="section-kicker">100+ KİŞİ · ÖZEL KURULUM</span>
          <h2 id="corporate-lead-title">Kurumsal yapınızı birlikte planlayalım.</h2>
          <p>100+ çalışan, özel entegrasyon, farklı kart şablonları veya kuruma özel raporlama ihtiyacınızı paylaşın. Size uygun kapasite ve fiyatlandırmayla dönüş yapalım.</p>
        </div>
        <CorporateLeadForm plan={selectedPlan} />
      </section>

      <section className="corporate-analytics-section" aria-labelledby="corporate-analytics-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">ÖLÇÜLEBİLİR KARTVİZİT</span>
          <h2 id="corporate-analytics-title">Kart dağıtmakla kalmayın. Kullanımı görün.</h2>
          <p>Kurumsal panel, ekip kartlarının görünürlüğünü ve kullanımını tek yerde toplar.</p>
        </div>
        <div className="corporate-analytics-grid">
          {analytics.map((item) => (
            <article key={item.title}>
              <strong>{item.value}</strong>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="corporate-use-cases" aria-labelledby="corporate-use-cases-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">EKİP SENARYOLARI</span>
          <h2 id="corporate-use-cases-title">Satıştan İK’ya, aynı standart.</h2>
        </div>
        <div className="corporate-use-case-grid">
          {useCases.map((item) => (
            <article key={item.title}>
              <Icon name={item.icon} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="corporate-steps-section" aria-labelledby="corporate-steps-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">KURULUM</span>
          <h2 id="corporate-steps-title">Üç adımda ekibiniz yayında.</h2>
        </div>
        <ol className="corporate-step-grid">
          {steps.map(([number, title, text]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
