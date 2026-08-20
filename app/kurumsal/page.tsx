import { Icon } from "../icons";
import AddToCartButton from "../components/AddToCartButton";
import CorporatePackPicker from "./CorporatePackPicker";
import {
  CAMPAIGN_MAIL_PACKS,
  CORPORATE_PACKAGE_LADDER,
  CORPORATE_PACKAGE_PRODUCT_SLUG,
  CORPORATE_SHARED_FEATURES,
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
    { icon: "analytics" as const, title: "Ölçülebilir", text: "Hangi kartın çalıştığını ekip bazında görürsünüz." },
  ];

  return (
    <main id="main-content" className="theme-light corporate-page corporate-sales-page corporate-single-page">

      <section className="corporate-single-hero" aria-labelledby="corporate-single-title">
        <div className="corporate-single-copy">
          <span className="section-kicker">YENOMI BUSINESS</span>
          <h1 id="corporate-single-title">Şirket NFC kart almıyor. <em>Çalışanların networking altyapısını satın alıyor.</em></h1>
          <p>Satış ve saha ekibi aynı standartta tanışır. Unvan değişince baskı yok; kart kaybolursa panelden kapanır. 100 kişiye kadar sepete ekle.</p>
          <div className="corporate-hero-actions">
            <a href="#business-pricing-title" className="corporate-cta">Paketleri İncele <span aria-hidden="true">→</span></a>
            <a href="#teklif" className="corporate-secondary-cta">100+ kişi için teklif <span aria-hidden="true">→</span></a>
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
              <span className="corporate-dashboard-live">● CANLI</span>
            </div>
            <div className="corporate-dashboard-body">
              <aside className="corporate-dashboard-sidebar" aria-hidden="true">
                <span className="active" /><span /><span /><span /><span />
              </aside>
              <div className="corporate-dashboard-content">
                <div className="corporate-dashboard-heading"><div><small>BU AY</small><strong>Networking özeti</strong></div><span>•••</span></div>
                <div className="corporate-dashboard-kpis">
                  <div><small>Bağlantı</small><strong>482</strong><span>kişiyle tanışıldı</span></div>
                  <div><small>Follow-up</small><strong>219</strong><span>Network Mail</span></div>
                  <div><small>Yeni lead</small><strong>87</strong><span>64 toplantı</span></div>
                </div>
                <div className="corporate-dashboard-grid">
                  <div className="corporate-dashboard-chart"><small>KART ETKİLEŞİMLERİ</small><div className="corporate-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
                  <div className="corporate-dashboard-team"><small>EKİP DURUMU</small><div><b />Aktif <strong>231</strong></div><div><b />Beklemede <strong>12</strong></div><div><b />Pasif <strong>5</strong></div></div>
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
          <span className="section-kicker">YENOMI BUSINESS</span>
          <h2 id="corporate-single-cta-title">Ekip aynı standartta tanışır. Yönetim tek panelde kalır.</h2>
          <p>100 kişiye kadar paketi doğrudan sepete ekleyin. 100 kişiyi aşan kapasite ve özel kurulum için teklif alın.</p>
        </div>
        <div className="corporate-single-cta-actions">
          <a href="#business-pricing-title" className="corporate-cta">Paketleri İncele <span aria-hidden="true">→</span></a>
          <a href="/giris?portal=business&next=%2Fkurumsal%2Fpanel" className="corporate-secondary-cta">Kurumsal Giriş <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section className="corporate-pricing-section corporate-single-details" aria-labelledby="business-pricing-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">YILLIK KURUMSAL SİSTEM</span>
          <h2 id="business-pricing-title">Kişi sayısı artınca kişi başı düşer.</h2>
          <p>Her pakette NFC kart + 1 yıl üyelik + Türkiye içi ücretsiz kargo birlikte düşünülür. Network Mail kişi başı 100 kredidir; 10 kişi 5 kişiyle aynı fiyat olmaz.</p>
        </div>
        <CorporatePackPicker
          packs={packOptions}
          productId={CORPORATE_PACKAGE_PRODUCT_SLUG}
          initialCode={selectedPlan}
        />
        <details className="corporate-pack-details">
          <summary>Tüm fiyat listesini tablo olarak gör</summary>
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
                      {"popular" in plan && plan.popular ? <span className="corporate-pack-badge">Öne çıkan</span> : null}
                    </th>
                    <td>{plan.seats}</td>
                    <td>{plan.seats}</td>
                    <td>{networkMailGrant(plan.seats).toLocaleString("tr-TR")}</td>
                    <td>{formatTryFromKurus(perSeatKurus(plan.priceKurus, plan.seats))}</td>
                    <td><strong>{formatTryFromKurus(plan.priceKurus)}</strong></td>
                    <td>
                      {corporateCheckoutLive(plan.seats) ? (
                        <AddToCartButton
                          productId={CORPORATE_PACKAGE_PRODUCT_SLUG}
                          variantSku={corporatePackageSku(plan.code)}
                          kind="BUSINESS_CARD"
                          name={plan.name}
                          unitPriceKurus={plan.priceKurus}
                          label="Sepete Ekle"
                          appearance="secondary"
                          className={"popular" in plan && plan.popular ? "corporate-plan-link" : "corporate-plan-text"}
                          configuration={{ packageCode: plan.code, seatCount: plan.seats }}
                        />
                      ) : (
                        <a href={`/kurumsal?plan=${plan.code}#teklif`} className="corporate-plan-text">
                          Teklif Al
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        <p className="corporate-pack-note">Tüm paketlerde: 1 yıllık kullanım + NFC kart + ücretsiz kargo. Kullanılmayan Network Mail kredisi paket yenilenirse devreder; yenilenmezse yanar.</p>
        <div className="corporate-pricing-grid corporate-pricing-grid--compact">
          <article className="is-featured">
            <span>CORP-10</span>
            <h3>Kurumsal 10</h3>
            <p>10 NFC kart, 10 dijital profil, 1 şirket paneli, 1.000 Network Mail.</p>
            <strong>{formatTryFromKurus(990_000)} <small>/ yıl</small></strong>
            <ul>{CORPORATE_SHARED_FEATURES.slice(0, 8).map((item) => <li key={item}>{item}</li>)}</ul>
            <AddToCartButton
              productId={CORPORATE_PACKAGE_PRODUCT_SLUG}
              variantSku={corporatePackageSku("CORP-10")}
              kind="BUSINESS_CARD"
              name="Kurumsal 10"
              unitPriceKurus={990_000}
              label="Sepete Ekle"
              className="corporate-cta"
              configuration={{ packageCode: "CORP-10", seatCount: 10 }}
            />
          </article>
          <article className="enterprise">
            <span>ENTERPRISE</span>
            <h3>Enterprise</h3>
            <p>100 kişiyi aşan kapasite, özel kurulum ve raporlama.</p>
            <strong>Özel teklif</strong>
            <ul>
              <li>Özel çalışan kapasitesi</li>
              <li>Kuruma özel uygulama planı</li>
              <li>Merkezi yönetim ve raporlama</li>
            </ul>
            <a href="/kurumsal?plan=ENTERPRISE#teklif" className="corporate-cta">Teklif Al <span aria-hidden="true">→</span></a>
          </article>
        </div>
        <div className="corporate-mail-packs">
          <article>
            <span>NETWORK MAIL</span>
            <h3>{NETWORK_MAIL_POSITIONING.name}</h3>
            <p>{NETWORK_MAIL_POSITIONING.promise} {NETWORK_MAIL_POSITIONING.unit}. {NETWORK_MAIL_POSITIONING.notBulk}</p>
            <ul>
              {NETWORK_MAIL_CREDIT_PACKS.map((pack) => (
                <li key={pack.sku}><b>{pack.credits.toLocaleString("tr-TR")} kredi</b> {formatTryFromKurus(pack.priceKurus)}</li>
              ))}
            </ul>
            <a href="/kurumsal?plan=NETWORK-MAIL#teklif" className="corporate-cta">Kredi paketi teklifi <span aria-hidden="true">→</span></a>
          </article>
          <article>
            <span>CAMPAIGN MAIL</span>
            <h3>Toplu kampanya — ikinci aşama</h3>
            <p>Pazarlama gönderimi Network Mail kredisinden düşmez. Bu katalog henüz checkout’ta satılmaz.</p>
            <ul>
              {CAMPAIGN_MAIL_PACKS.map((pack) => (
                <li key={pack.sku}><b>{pack.credits.toLocaleString("tr-TR")} Campaign Mail</b> {formatTryFromKurus(pack.priceKurus)}</li>
              ))}
            </ul>
            <a href="/kurumsal?plan=CAMPAIGN-MAIL#teklif" className="corporate-cta">Teklif Al <span aria-hidden="true">→</span></a>
          </article>
        </div>
      </section>

      <section className="corporate-lead-section" id="teklif" aria-labelledby="corporate-lead-title">
        <div className="corporate-lead-copy">
          <span className="section-kicker">KURUMSAL TEKLİF</span>
          <h2 id="corporate-lead-title">100 kişiyi aşan ekipler için özel kapsam çıkaralım.</h2>
          <p>Enterprise ve özel kurulum talepleriniz kayda alınır; ekibimiz 1 iş günü içinde sizinle iletişime geçer. 100 kişiye kadar paketleri doğrudan sepete ekleyebilirsiniz.</p>
          <ul><li>Kurulum ve kart kapsamı birlikte netleştirilir.</li><li>Özel kapasite gerekiyorsa Enterprise planı ayrıca değerlendirilir.</li><li>İsterseniz <a href="mailto:hello@yenomilabs.com?subject=Yenomi%20Business%20Teklif">e-posta ile</a> ulaşabilirsiniz.</li></ul>
        </div>
        <CorporateLeadForm plan={selectedPlan || "GENEL"} />
      </section>
    </main>
  );
}
