import { Icon } from "../icons";
import AddToCartButton from "../components/AddToCartButton";
import CorporatePackPicker from "./CorporatePackPicker";
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
  { value: "Tek panel", label: "Tüm çalışan kimlikleri" },
  { value: "Dakikalar", label: "Yeni çalışan kurulumu" },
  { value: "Anında", label: "Pasife alma ve güncelleme" },
  { value: "Ölçülebilir", label: "Kart etkileşimleri" },
];

const analytics = [
  { value: "30 gün", title: "Güncel görüntülenme", text: "Ekibinizin kartlarının son 30 gündeki toplam erişimini tek bakışta izleyin." },
  { value: "Toplam", title: "Birikimli performans", text: "Kurumsal kartların yayına alındığı günden itibaren oluşan toplam görüntülenmeyi görün." },
  { value: "Kart bazında", title: "Ekip karşılaştırması", text: "Hangi çalışan kartlarının daha fazla görüntülendiğini karşılaştırın." },
  { value: "Ülke bazında", title: "Erişim dağılımı", text: "Kart etkileşimlerinin ülkelere göre dağılımını kurumsal panelden takip edin." },
];

const corporateResources = [
  { icon: "box" as const, title: "Ürün kataloğu", text: "Güncel ürün kataloğunuzu PDF olarak yükleyin veya katalog URL’nizi ekleyin." },
  { icon: "building" as const, title: "Şirket sunumu", text: "Kurumsal sunumunuzu çalışan kartlarından tek dokunuşla erişilebilir hale getirin." },
  { icon: "clock" as const, title: "Toplantı planlama", text: "Randevu ve toplantı bağlantılarını doğrudan kurumsal karta bağlayın." },
  { icon: "external" as const, title: "Referans projeler", text: "Vaka çalışmaları ve referans projelerinizi PDF veya web bağlantısıyla paylaşın." },
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

export default async function CorporatePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const packOptions = CORPORATE_PACKAGE_LADDER.map((plan) => ({
    code: plan.code,
    name: plan.name,
    seats: plan.seats,
    priceKurus: plan.priceKurus,
    perSeatKurus: perSeatKurus(plan.priceKurus, plan.seats),
    networkMail: networkMailGrant(plan.seats),
    popular: "popular" in plan && Boolean(plan.popular),
    checkoutLive: corporateCheckoutLive(plan.seats),
    sku: corporatePackageSku(plan.code),
  }));
  const capabilities = [
    { icon: "users" as const, title: "Toplu Yönetim", text: "Çalışan ve kart tek panelde. Yeni kişi dakikalar içinde yayında." },
    { icon: "building" as const, title: "Marka Kontrolü", text: "Logo, renk, şablon. Dağınık kartvizit kalmaz." },
    { icon: "shield" as const, title: "Yetki & Güvenlik", text: "Rol kilitli erişim. Ayrılan kart panelden kapanır." },
    { icon: "analytics" as const, title: "Ölçülebilir", text: "Kart etkileşimlerini ekip bazında izleyin." },
  ];

  return (
    <main id="main-content" className="theme-light corporate-page corporate-sales-page corporate-single-page">
      <section className="corporate-single-hero" aria-labelledby="corporate-single-title">
        <div className="corporate-single-copy">
          <span className="section-kicker">YENOMI BUSINESS</span>
          <h1 id="corporate-single-title">
            <span className="corporate-hero-line">Ekibiniz tek kartvizit standardıyla tanışsın.</span>
            <span className="corporate-hero-line corporate-hero-line--accent">Kimlikleri merkezden yönetin, yeniden baskıyı azaltın.</span>
          </h1>
          <p>Çalışan kartları, canlı profiller, yetkiler ve kayıp kart yönetimi tek panelde. 2–100 kişi için paketinizi doğrudan seçin; 100+ kişi ve özel entegrasyonlarda birlikte planlayalım.</p>
          <div className="corporate-hero-actions">
            <a href="#business-pricing-title" className="corporate-cta">Ekibime Uygun Paketi Seç <span aria-hidden="true">→</span></a>
            <a href="/kurumsal?plan=ENTERPRISE#teklif" className="home-mockup__link-secondary">100+ Kişi İçin Teklif Al <span aria-hidden="true">→</span></a>
          </div>
          <div className="corporate-single-proof" aria-label="Kurumsal ürün sonuçları">
            {outcomes.slice(0, 3).map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
          </div>
        </div>

        <div className="corporate-dashboard-stage" aria-label="Yenomi ID kurumsal panel önizlemesi">
          <div className="corporate-dashboard-glow" />
          <div className="corporate-dashboard-window">
            <div className="corporate-dashboard-topbar">
              <div><span className="corporate-dashboard-dot" />YENOMI ID <small>Kurumsal Panel</small></div>
              <span className="corporate-dashboard-live">Örnek panel</span>
            </div>
            <div className="corporate-dashboard-body">
              <aside className="corporate-dashboard-sidebar" aria-hidden="true">
                <span className="active" /><span /><span /><span /><span />
              </aside>
              <div className="corporate-dashboard-content">
                <div className="corporate-dashboard-heading"><div><small>BU AY</small><strong>Networking özeti</strong></div><span>•••</span></div>
                <div className="corporate-dashboard-kpis">
                  <div><small>Bağlantı</small><strong>Tanışma</strong><span>karttan gelen kişi</span></div>
                  <div><small>Follow-up</small><strong>Network Mail</strong><span>takip mesajı</span></div>
                  <div><small>Lead</small><strong>Toplantı</strong><span>sonraki adım</span></div>
                </div>
                <div className="corporate-dashboard-grid">
                  <div className="corporate-dashboard-chart"><small>KART ETKİLEŞİMLERİ</small><div className="corporate-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
                  <div className="corporate-dashboard-team"><small>EKİP DURUMU</small><div><b />Aktif</div><div><b />Beklemede</div><div><b />Pasif</div></div>
                </div>
                <div className="corporate-dashboard-footer"><span>Şablonlar</span><span>Entegrasyonlar</span><span>Güvenlik</span><span>Analitik</span></div>
              </div>
            </div>
          </div>
          <div className="corporate-dashboard-badge"><span /> Merkezi yönetim</div>
        </div>
      </section>

      <section className="corporate-capability-bar" aria-label="Kurumsal çözüm yetenekleri">
        {capabilities.map((item) => <article key={item.title}>
          <div className="corporate-capability-icon"><Icon name={item.icon} /></div>
          <div><h2>{item.title}</h2><p>{item.text}</p></div>
        </article>)}
      </section>

      <section className="corporate-single-cta" aria-labelledby="corporate-single-cta-title">
        <div>
          <span className="section-kicker">PAKETİNİZİ SEÇİN</span>
          <h2 id="corporate-single-cta-title">2–100 kişi için doğrudan satın alın. Daha büyük ekipte birlikte planlayalım.</h2>
          <p>Önce ekip büyüklüğünü seçin. Fiyat, kişi başı maliyet ve dahil olan kapasite tek ekranda görünür. 100+ kişi veya özel entegrasyonlarda teklif akışına geçin.</p>
        </div>
        <div className="corporate-single-cta-actions">
          <a href="#business-pricing-title" className="corporate-cta">Paketimi Seç <span aria-hidden="true">→</span></a>
          <a href="/giris?portal=business&next=%2Fkurumsal%2Fpanel" className="corporate-secondary-cta">Kurumsal Giriş</a>
        </div>
      </section>

      <section className="corporate-pricing-section corporate-single-details" aria-labelledby="business-pricing-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">YILLIK KURUMSAL SİSTEM</span>
          <h2 id="business-pricing-title">Önce seviyeyi, sonra ekip büyüklüğünü seçin.</h2>
          <p>Start 2–10 kişilik ekipler için hızlı başlangıçtır. Business 25–100 kişilik büyüyen ekipler için en dengeli yapıdır. Enterprise 100+ kişi, özel raporlama veya entegrasyon ihtiyacında kuruma özel planlanır.</p>
        </div>
        <CorporatePackPicker
          packs={packOptions}
          productId={CORPORATE_PACKAGE_PRODUCT_SLUG}
          initialCode={selectedPlan}
        />
        <details className="corporate-pack-details">
          <summary>Tüm kapasite ve yıllık fiyatları karşılaştır</summary>
          <div className="corporate-pack-table-wrap">
            <table className="corporate-pack-table">
              <caption className="sr-only">Kurumsal fiyat listesi</caption>
              <thead>
                <tr>
                  <th scope="col">Paket</th>
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
                  <tr key={plan.code} className={"popular" in plan && plan.popular ? "is-popular" : undefined}>
                    <th scope="row">
                      {plan.name}
                      {"popular" in plan && plan.popular ? <span className="corporate-pack-badge">En çok tercih edilen</span> : null}
                    </th>
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
                          label="Bu Paketi Seç"
                          appearance="secondary"
                          className={"popular" in plan && plan.popular ? "corporate-plan-link" : "corporate-plan-text"}
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
        <p className="corporate-pack-note">Doğrudan satın alınabilen paketlerde 1 yıllık kullanım, seçilen kullanıcı sayısı kadar NFC kart ve Türkiye içi ücretsiz kargo dahildir. Ekip büyüdükçe kişi başı maliyet düşer.</p>
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
          <p>100+ çalışan, özel entegrasyon, farklı kart şablonları veya kuruma özel raporlama ihtiyacınızı paylaşın. Size uygun yapı ve fiyatlandırmayla dönüş yapalım.</p>
        </div>
        <CorporateLeadForm initialPlan={selectedPlan} />
      </section>

      <section className="corporate-analytics-section" aria-labelledby="corporate-analytics-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">ÖLÇÜLEBİLİR KARTVİZİT</span>
          <h2 id="corporate-analytics-title">Kart dağıtmakla kalmayın. Kullanımı görün.</h2>
          <p>Kurumsal panel, ekip kartlarının görünürlüğünü ve kullanımını tek yerde toplar.</p>
        </div>
        <div className="corporate-analytics-grid">
          {analytics.map((item) => <article key={item.title}><strong>{item.value}</strong><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div>
      </section>

      <section className="corporate-resource-section" aria-labelledby="corporate-resource-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">KARTTAN DAHA FAZLASI</span>
          <h2 id="corporate-resource-title">Satış materyallerinizi de aynı profile bağlayın.</h2>
          <p>Çalışan kartı yalnız iletişim bilgisi değil, kurumsal kaynaklara açılan kontrollü bir giriş noktası olur.</p>
        </div>
        <div className="corporate-resource-grid">
          {corporateResources.map((item) => <article key={item.title}><Icon name={item.icon} /><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div>
      </section>

      <section className="corporate-usecase-section" aria-labelledby="corporate-usecase-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">KULLANIM SENARYOLARI</span>
          <h2 id="corporate-usecase-title">Ekip büyüdükçe kartvizit dağılmasın.</h2>
        </div>
        <div className="corporate-usecase-grid">
          {useCases.map((item) => <article key={item.title}><Icon name={item.icon} /><h3>{item.title}</h3><p>{item.text}</p></article>)}
        </div>
      </section>

      <section className="corporate-steps-section" aria-labelledby="corporate-steps-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">KURUMSAL KURULUM</span>
          <h2 id="corporate-steps-title">Üç adımda ekibiniz yayında.</h2>
        </div>
        <ol className="corporate-steps-grid">
          {steps.map(([number, title, text]) => <li key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}
        </ol>
      </section>
    </main>
  );
}
