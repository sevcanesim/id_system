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

const employeeSpecimens = [
  { name: "Selin Kaya", role: "Satış Yöneticisi", status: "Aktif", action: "Kart Atandı", statusClass: "is-active" },
  { name: "Ahmet Demir", role: "Saha Ekibi", status: "Güncellendi", action: "Bilgiler Yenilendi", statusClass: "is-updated" },
  { name: "Zeynep Arslan", role: "Operasyon Müdürü", status: "Pasif", action: "Erişim Kapatıldı", statusClass: "is-disabled" },
];

const leadProcess = [
  { step: "01", title: "İhtiyaç analizi", text: "Ekip yapısı, çalışan sayısı ve özel entegrasyon beklentilerinizi netleştiririz." },
  { step: "02", title: "Kapasite ve fiyatlandırma", text: "Kurumunuza özel kapasite paketini ve avantajlı fiyatlandırmayı sunarız." },
  { step: "03", title: "Kurulum planı", text: "Toplu çalışan aktarımı, kart üretimi ve panel aktivasyonunu başlatırız." },
];

const networkMailBullets = [
  { title: "Kartvizitin yanında değil mi?", desc: "Profilin NFC ve QR ile her zaman hazır." },
  { title: "Fuarda onlarca kişiyle tanıştın mı?", desc: "Tanışmaları takip mesajıyla devam ettir." },
  { title: "İletişim unutuluyor mu?", desc: "Kişiselleştirilmiş follow-up ile bağlantıyı sıcak tut." },
];

const networkMailTags = [
  "Fuarlar", "Konferanslar", "Toplantılar", "Saha Ziyaretleri", "Networking Etkinlikleri", "B2B Görüşmeler"
];

export default async function CorporatePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string | string[] }>;
}) {
  const params = await searchParams;
  const selectedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;

  return (
    <main id="main-content" className="theme-light corporate-page corporate-sales-page corporate-single-page">
      {/* 01 HERO */}
      <section className="corporate-single-hero corporate-authentic-hero" aria-labelledby="corporate-single-title">
        <div className="corporate-single-copy">
          <span className="section-kicker">YENOMI BUSINESS</span>
          <h1 id="corporate-single-title">
            <span className="corporate-hero-line">Ekibinizin dijital kimliğini</span>
            <span className="corporate-hero-line corporate-hero-line--accent">tek panelden yönetin.</span>
          </h1>
          <p>Yeni çalışanı yayınlayın, bilgileri güncelleyin ve ayrılan personelin kartını anında kapatın. Tüm kurumsal hesaplar tek panelden yönetilir; yeniden baskı maliyetini ve dağınık kartvizit yönetimini ortadan kaldırır.</p>
          <div className="corporate-hero-actions">
            <a href="#kapasite" className="corporate-cta">Kapasite ve Fiyatları Gör <span aria-hidden="true">→</span></a>
            <a href="/kurumsal?plan=ENTERPRISE#teklif" className="home-mockup__link-secondary">100+ Kişi İçin Teklif Al <span aria-hidden="true">→</span></a>
          </div>
        </div>

        {/* Hero Product Specimen: Authentic Enterprise Management UI */}
        <aside className="corporate-authentic-proof corporate-hero-specimen" aria-label="Yenomi ID kurumsal yönetim ekranı örneği">
          <div className="corporate-authentic-proof__head">
            <div className="corporate-specimen-badge">MERKEZİ ÇALIŞAN YÖNETİMİ</div>
            <strong>Günlük çalışan hareketlerini tek panelden kontrol edin.</strong>
          </div>
          <div className="corporate-specimen-table">
            <div className="corporate-specimen-table__header">
              <span>Çalışan</span>
              <span>Ünvan</span>
              <span>Durum</span>
              <span>Aksiyon</span>
            </div>
            {employeeSpecimens.map((emp) => (
              <div key={emp.name} className="corporate-specimen-table__row">
                <div className="corporate-specimen-user">
                  <span className="corporate-specimen-avatar">{emp.name[0]}</span>
                  <strong>{emp.name}</strong>
                </div>
                <span className="corporate-specimen-role">{emp.role}</span>
                <span className={`corporate-specimen-status ${emp.statusClass}`}>{emp.status}</span>
                <span className="corporate-specimen-action">{emp.action}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {/* 02 ENTERPRISE MANAGEMENT PROOF */}
      <section className="corporate-authentic-outcomes" aria-label="Kurumsal ürün sonuçları">
        {outcomes.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      {/* 03 CAPACITY & PRICING */}
      <section className="corporate-pricing-section corporate-single-details" id="kapasite" aria-labelledby="business-pricing-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">YILLIK KURUMSAL SİSTEM</span>
          <h2 id="business-pricing-title">Tek panel, ekip büyüklüğüne göre kapasite.</h2>
          <p>Tüm kurumsal hesaplarda aynı yönetim deneyimi kullanılır. Aşağıdaki seçenekler özellik seviyesi değil; yalnızca kullanıcı, NFC kart ve yıllık kapasite farkını gösterir.</p>
        </div>
        <p className="corporate-pack-scroll-hint" aria-hidden="true">Tüm paketleri görmek için kaydırın →</p>
        <div className="corporate-pack-table-wrap">
          <table className="corporate-pack-table">
            <caption className="sr-only">Kurumsal kapasite ve fiyat listesi</caption>
            <thead>
              <tr>
                <th scope="col">Kapasite</th>
                <th scope="col" className="is-num">Kullanıcı</th>
                <th scope="col" className="is-num">NFC Kart</th>
                <th scope="col" className="is-num">Network Mail</th>
                <th scope="col" className="is-num">Kişi Başı (Yıllık)</th>
                <th scope="col" className="is-num">Toplam Yıllık Fiyat</th>
                <th scope="col"><span className="sr-only">Aksiyon</span></th>
              </tr>
            </thead>
            <tbody>
              {CORPORATE_PACKAGE_LADDER.map((plan) => {
                const isRecommended = plan.seats === 10;
                return (
                  <tr key={plan.code} className={isRecommended ? "is-recommended" : ""}>
                    <th scope="row">
                      <div className="corporate-table-capacity-wrap">
                        <span>{plan.seats} kişilik</span>
                        {isRecommended && <span className="corporate-tier-badge">En Çok Tercih Edilen</span>}
                      </div>
                    </th>
                    <td className="is-num">{plan.seats}</td>
                    <td className="is-num">{plan.seats}</td>
                    <td className="is-num">{networkMailGrant(plan.seats).toLocaleString("tr-TR")} <span className="corporate-unit-sub">kredi</span></td>
                    <td className="is-num corporate-price-secondary">{formatTryFromKurus(perSeatKurus(plan.priceKurus, plan.seats))}<span className="corporate-price-subperiod"> / kişi</span></td>
                    <td className="is-num corporate-price-primary"><strong>{formatTryFromKurus(plan.priceKurus)}</strong> <span className="corporate-price-period">/ yıl</span></td>
                    <td className="is-action">
                      {corporateCheckoutLive(plan.seats) ? (
                        <AddToCartButton
                          productId={CORPORATE_PACKAGE_PRODUCT_SLUG}
                          variantSku={corporatePackageSku(plan.code)}
                          kind="BUSINESS_CARD"
                          name={plan.name}
                          unitPriceKurus={plan.priceKurus}
                          label="Sepete Ekle"
                          appearance={isRecommended ? "primary" : "secondary"}
                          className="corporate-plan-text"
                          configuration={{ packageCode: plan.code, seatCount: plan.seats }}
                        />
                      ) : (
                        <a href={`/kurumsal?plan=${plan.code}#teklif`} className="corporate-plan-text">Teklif Al</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="corporate-pack-note">1 yıllık kullanım, seçilen kullanıcı sayısı kadar NFC kart ve Türkiye içi ücretsiz kargo dahildir. Panel özellikleri kurumsal hesaplar arasında değişmez; yalnızca kapasite ekip büyüklüğüne göre seçilir.</p>
      </section>

      {/* 04 NETWORK MAIL */}
      <section className="corporate-network-mail-section" id="network-mail" aria-labelledby="network-mail-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">NETWORK MAIL</span>
          <h2 id="network-mail-title">Tanışma kartvizitte kalmasın.</h2>
          <p>Fuarda yüzlerce kartvizit el değiştirir; çoğunun ardından tek bir e-posta bile gitmez. Yenomi ID, ilk teması kaybolmadan devam ettirmenizi sağlar.</p>
        </div>

        <div className="corporate-network-mail-grid">
          {/* Left Column: Value Proposition & Credit Economics */}
          <div className="corporate-network-mail-left">
            <div className="corporate-mail-bullets">
              {networkMailBullets.map((b) => (
                <div key={b.title} className="corporate-mail-bullet">
                  <strong>{b.title}</strong>
                  <p>{b.desc}</p>
                </div>
              ))}
            </div>

            <div className="corporate-mail-cro-quote">
              <strong>Tanıştığınız kişiyi kartvizit yığınına bırakmayın.</strong>
            </div>

            <div className="corporate-mail-use-cases">
              <span className="corporate-mail-use-cases__label">KULLANIM ALANLARI</span>
              <div className="corporate-mail-tags">
                {networkMailTags.map((tag) => (
                  <span key={tag} className="corporate-mail-tag">{tag}</span>
                ))}
              </div>
            </div>

            {/* Credit pricing block */}
            <article className="corporate-mail-credits-box">
              <div className="corporate-mail-credits-box__head">
                <span>PAKET EKONOMİSİ</span>
                <h3>{NETWORK_MAIL_POSITIONING.name}</h3>
                <p>{NETWORK_MAIL_POSITIONING.promise} {NETWORK_MAIL_POSITIONING.unit}. {NETWORK_MAIL_POSITIONING.notBulk}</p>
              </div>
              <ul className="corporate-mail-credits-list">
                {NETWORK_MAIL_CREDIT_PACKS.map((pack) => {
                  const unitKurus = Math.round(pack.priceKurus / pack.credits);
                  return (
                    <li key={pack.sku} className="corporate-credit-pack-item">
                      <div className="corporate-credit-pack-meta">
                        <strong className="corporate-credit-pack-name">{pack.credits.toLocaleString("tr-TR")} kredi</strong>
                        <span className="corporate-credit-pack-unit">{formatTryFromKurus(unitKurus)} / kredi</span>
                      </div>
                      <div className="corporate-credit-pack-pricing">
                        <strong className="corporate-price-primary">{formatTryFromKurus(pack.priceKurus)}</strong>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <a href="/kurumsal?plan=NETWORK-MAIL#teklif" className="home-mockup__link-secondary">
                Network Mail için Teklif Al <span aria-hidden="true">→</span>
              </a>
            </article>
          </div>

          {/* Right Column: Authentic Product Specimen & Visual Sequence */}
          <div className="corporate-network-mail-right">
            <div className="corporate-mail-sequence-bar" aria-label="Temas Akış Adımları">
              <div className="corporate-sequence-step"><span>01</span> <strong>Tanışılan kişi</strong></div>
              <div className="corporate-sequence-arrow">→</div>
              <div className="corporate-sequence-step"><span>02</span> <strong>Yenomi ID profili açıldı</strong></div>
              <div className="corporate-sequence-arrow">→</div>
              <div className="corporate-sequence-step"><span>03</span> <strong>İletişim bilgisi kaydedildi</strong></div>
              <div className="corporate-sequence-arrow">→</div>
              <div className="corporate-sequence-step"><span>04</span> <strong>Takip e-postası hazırlanıyor</strong></div>
            </div>

            <div className="corporate-mail-specimen-card" aria-label="Network Mail Ürün Önizlemesi">
              <div className="corporate-mail-specimen-head">
                <span className="corporate-specimen-kicker">NETWORK MAIL ÖNİZLEME</span>
                <strong>Fuar & Temas Sonrası Otomatik Takip</strong>
              </div>
              <div className="corporate-mail-specimen-body">
                <div className="corporate-mail-field">
                  <span className="corporate-mail-field-label">Alıcı</span>
                  <span className="corporate-mail-field-val">Ahmet Yılmaz (ahmet@sirket.com)</span>
                </div>
                <div className="corporate-mail-field">
                  <span className="corporate-mail-field-label">Konu</span>
                  <span className="corporate-mail-field-val">Bugünkü görüşmemiz hakkında</span>
                </div>
                <div className="corporate-mail-preview-box">
                  <p>
                    &ldquo;Merhaba Ahmet Bey,<br />
                    bugün fuarda tanıştığımıza çok memnun oldum. Görüşmemizde bahsettiğim dijital kartvizit profilime ve kurumsal katalog bağlantılarımıza buradan ulaşabilirsiniz...&rdquo;
                  </p>
                </div>
                <div className="corporate-mail-specimen-footer">
                  <span className="corporate-mail-status-pill">Takip mesajı hazır</span>
                  <span className="corporate-mail-preview-action">Takip Mesajını Hazırla</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 05 100+ ENTERPRISE LEAD SECTION */}
      <section className="corporate-lead-section" id="teklif" aria-labelledby="corporate-lead-title">
        <div className="corporate-lead-copy">
          <span className="section-kicker">100+ KİŞİ · ÖZEL KURULUM</span>
          <h2 id="corporate-lead-title">Kurumsal yapınızı birlikte planlayalım.</h2>
          <p>100+ çalışan, özel entegrasyon, farklı kart şablonları veya kuruma özel raporlama ihtiyacınızı paylaşın. Size uygun kapasite ve fiyatlandırmayla dönüş yapalım.</p>
          
          <div className="corporate-lead-process">
            {leadProcess.map((p) => (
              <div key={p.step} className="corporate-lead-process-step">
                <span className="corporate-lead-step-num">{p.step}</span>
                <div>
                  <strong>{p.title}</strong>
                  <p>{p.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="corporate-lead-trust-signals">
            <span>1 iş günü içinde dönüş</span>
            <span>Ödeme bilgisi istenmez</span>
            <span>İhtiyaca göre yapılandırma</span>
          </div>
        </div>

        <CorporateLeadForm plan={selectedPlan} />
      </section>

      {/* 06 ANALYTICS / MEASUREMENT */}
      <section className="corporate-analytics-section" id="analiz" aria-labelledby="corporate-analytics-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">ÖLÇÜLEBİLİR KARTVİZİT</span>
          <h2 id="corporate-analytics-title">Kart dağıtmakla kalmayın. Kullanımı görün.</h2>
          <p>Kurumsal panel, tüm çalışan kartlarının görünürlüğünü, erişim sayılarını ve etkileşimlerini tek yerde toplar.</p>
        </div>

        <div className="corporate-analytics-container">
          <div className="corporate-analytics-grid">
            {analytics.map((item) => (
              <article key={item.title}>
                <strong>{item.value}</strong>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          {/* Analytics Authentic Product Specimen */}
          <div className="corporate-analytics-specimen" aria-label="Kurumsal Analitik Panel Önizlemesi">
            <div className="corporate-analytics-specimen__head">
              <div>
                <span className="corporate-specimen-kicker">EKİP ANALİTİK PANELİ</span>
                <strong>Son 30 Günlük Kart Etkileşim Raporu</strong>
              </div>
              <span className="corporate-analytics-growth">+24% Artış</span>
            </div>
            <div className="corporate-analytics-specimen__metrics">
              <div>
                <small>Toplam Erişim</small>
                <strong>14.820</strong>
              </div>
              <div>
                <small>Aktif Kart</small>
                <strong>48 / 50</strong>
              </div>
              <div>
                <small>En Çok Erişilen Ülke</small>
                <strong>Türkiye (%82)</strong>
              </div>
            </div>
            <div className="corporate-analytics-bars">
              <div className="corporate-bar" style={{ height: "45%" }} title="Hafta 1"></div>
              <div className="corporate-bar" style={{ height: "65%" }} title="Hafta 2"></div>
              <div className="corporate-bar" style={{ height: "80%" }} title="Hafta 3"></div>
              <div className="corporate-bar is-active" style={{ height: "100%" }} title="Hafta 4"></div>
            </div>
          </div>
        </div>
      </section>

      {/* 07 TEAM USE CASES */}
      <section className="corporate-use-cases" id="senaryolar" aria-labelledby="corporate-use-cases-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">EKİP SENARYOLARI</span>
          <h2 id="corporate-use-cases-title">Satıştan İK’ya, aynı kurumsal standart.</h2>
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

      {/* 08 SETUP PROCESS */}
      <section className="corporate-steps-section" id="kurulum" aria-labelledby="corporate-steps-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">KURULUM</span>
          <h2 id="corporate-steps-title">Üç adımda ekibiniz yayında.</h2>
        </div>
        <ol className="corporate-step-grid">
          {steps.map(([number, title, text]) => (
            <li key={number}>
              <span className="corporate-step-num">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* 09 FINAL CONVERSION CTA */}
      <section className="corporate-final-cta" id="baslayin" aria-labelledby="corporate-final-title">
        <div className="corporate-final-cta__content">
          <span className="section-kicker">KURUMSAL BAŞLANGIÇ</span>
          <h2 id="corporate-final-title">Ekibiniz için doğru kapasiteyi birlikte belirleyelim.</h2>
          <p>Tüm kurumsal hesaplar aynı yönetim deneyimine sahiptir. İhtiyacınıza uygun kapasiteyi seçin veya teklif alın.</p>
        </div>
        <div className="corporate-final-cta__actions">
          <a href="#kapasite" className="corporate-cta">Kapasite ve Fiyatları Gör <span aria-hidden="true">→</span></a>
          <a href="/kurumsal?plan=ENTERPRISE#teklif" className="home-mockup__link-secondary">100+ Kişi İçin Teklif Al <span aria-hidden="true">→</span></a>
        </div>
      </section>
    </main>
  );
}
