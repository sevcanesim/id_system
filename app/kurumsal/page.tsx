import Image from "next/image";
import Link from "next/link";
import { Icon } from "../icons";
import { COMMERCIAL_PRICING } from "../../lib/config/commercial";
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

export default function CorporatePage() {
  const capabilities = [
    { icon: "users" as const, title: "Toplu Yönetim", text: "Çalışanlarınızı ve kartlarını tek merkezden yönetin." },
    { icon: "building" as const, title: "Marka Kontrolü", text: "Şablon, logo, renk ve alan kurallarını merkezden belirleyin." },
    { icon: "shield" as const, title: "Yetki & Güvenlik", text: "Rol bazlı erişim ve güvenlik kontrollerini tek panelden yönetin." },
    { icon: "chart" as const, title: "Ölçülebilir", text: "Görüntülenme ve temas verilerini ekip bazında takip edin." },
  ];

  return (
    <main id="main-content" className="theme-light corporate-page corporate-sales-page corporate-single-page">

      <section className="corporate-single-hero" aria-labelledby="corporate-single-title">
        <div className="corporate-single-copy">
          <span className="section-kicker">YENOMI BUSINESS</span>
          <h1 id="corporate-single-title">Şirketinizin dijital kimlik standardını <em>tek merkezden yönetin.</em></h1>
          <p>Çalışan kartları, marka standartları, erişim yetkileri ve analitik verileri tek bir yönetim sisteminde birleştirin.</p>
          <div className="corporate-hero-actions">
            <a href="#teklif" className="corporate-cta">Demo İste <span aria-hidden="true">→</span></a>
            <a href="#business-pricing-title" className="corporate-secondary-cta">Paketleri İncele <span aria-hidden="true">→</span></a>
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
                <div className="corporate-dashboard-heading"><div><small>EKİP GENEL BAKIŞ</small><strong>Merhaba, Yenomi Business</strong></div><span>•••</span></div>
                <div className="corporate-dashboard-kpis">
                  <div><small>Çalışanlar</small><strong>248</strong><span>+12 bu ay</span></div>
                  <div><small>Aktif Kartlar</small><strong>231</strong><span>93.1% aktif</span></div>
                  <div><small>Görüntülenme</small><strong>12.8K</strong><span>+18.4%</span></div>
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
          <h2 id="corporate-single-cta-title">Ekibiniz için dijital kimlik standardını oluşturun.</h2>
          <p>Çalışan sayınızı ve kullanım senaryonuzu paylaşın; size uygun kart, lisans ve kurulum kapsamını birlikte çıkaralım.</p>
        </div>
        <div className="corporate-single-cta-actions">
          <a href="#teklif" className="corporate-cta">Teklif Al <span aria-hidden="true">→</span></a>
          <a href="/giris?portal=business&next=%2Fkurumsal%2Fpanel" className="corporate-secondary-cta">Kurumsal Giriş <span aria-hidden="true">→</span></a>
        </div>
      </section>

      <section className="corporate-pricing-section corporate-single-details" aria-labelledby="business-pricing-title">
        <div className="corporate-section-heading"><span className="section-kicker">YILLIK KURUMSAL SİSTEM</span><h2 id="business-pricing-title">Ekibiniz için net kapasite, tek yönetim standardı.</h2><p>Fiyatlar kart adedinin yanında çalışan dijital kartvizitlerini, yönetim panelini ve yıllık dijital hizmeti kapsar.</p></div>
        <div className="corporate-pricing-grid">
          {[COMMERCIAL_PRICING.BUSINESS_STARTER, COMMERCIAL_PRICING.BUSINESS_GROWTH, COMMERCIAL_PRICING.BUSINESS].map((plan) => <article key={plan.code}>
            <span>{plan.code}</span><h3>{plan.code === "STARTER" ? "Starter" : plan.code === "GROWTH" ? "Growth" : "Business"}</h3>
            <p>{plan.seats} çalışan için Kurumsal Dijital Kartvizit Sistemi</p><strong>{formatTryFromKurus(plan.priceKurus)} <small>/ yıl</small></strong>
            <ul><li>Kurumsal yönetim paneli</li><li>{plan.seats} çalışan dijital kartviziti</li><li>NFC + QR kartlar</li><li>Rol, şablon ve şirket bilgisi yönetimi</li></ul>
            <a href="#teklif" className="corporate-plan-link">Teklif Al <span>→</span></a>
          </article>)}
          <article className="enterprise"><span>ENTERPRISE</span><h3>Enterprise</h3><p>Özel kapasite ve kurulum ihtiyaçları için birlikte tasarlanan sistem.</p><strong>Özel teklif</strong><ul><li>Özel çalışan kapasitesi</li><li>Kuruma özel uygulama planı</li><li>Merkezi yönetim ve raporlama</li></ul><a href="#teklif" className="corporate-plan-link">Teklif Al <span>→</span></a></article>
        </div>
      </section>

      <section className="corporate-lead-section" id="teklif" aria-labelledby="corporate-lead-title">
        <div className="corporate-lead-copy">
          <span className="section-kicker">KURUMSAL TEKLİF</span>
          <h2 id="corporate-lead-title">İhtiyacınızı paylaşın, net kapsamı birlikte çıkaralım.</h2>
          <p>Çalışan sayısı, paket tercihi ve kullanım senaryonuzu gönderin. Talebiniz kayda alınır ve ekibimiz 1 iş günü içinde sizinle iletişime geçer.</p>
          <ul><li>Kurulum ve kart kapsamı birlikte netleştirilir.</li><li>Özel kapasite gerekiyorsa Enterprise planı ayrıca değerlendirilir.</li><li>İsterseniz <a href="mailto:hello@yenomilabs.com?subject=Yenomi%20Business%20Teklif">e-posta ile</a> ulaşabilirsiniz.</li></ul>
        </div>
        <CorporateLeadForm />
      </section>
    </main>
  );
}
