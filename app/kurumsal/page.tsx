import { Icon } from "../icons";
import AddToCartButton from "../components/AddToCartButton";
import {
  CORPORATE_PACKAGE_LADDER,
  CORPORATE_PACKAGE_PRODUCT_SLUG,
  corporateCheckoutLive,
  corporatePackageSku,
  corporateRenewalPriceKurus,
} from "../../lib/commerce/packages";
import { formatTryFromKurus } from "../../lib/config/product";
import CorporateLeadForm from "./CorporateLeadForm";
import CorporateHashScroll from "./CorporateHashScroll";

const outcomes = [
  { value: "Tek panel", label: "Çalışan, kart ve profil yönetimi" },
  { value: "Anında", label: "Bilgi güncelleme ve kart kapatma" },
  { value: "Tek standart", label: "Tüm ekipte kurumsal görünüm" },
];

const useCases = [
  { icon: "users" as const, title: "Satış ve saha ekipleri", text: "Her çalışan aynı kurumsal görünümle paylaşım yapar; iletişim ve şirket bağlantıları tek profilde kalır." },
  { icon: "building" as const, title: "İK ve yönetim", text: "Yeni çalışanı ekleyin, ünvan ve departmanı güncelleyin; ayrılan personelin erişimini anında kapatın." },
  { icon: "shield" as const, title: "Marka kontrolü", text: "Logo, renk, görünür alanlar ve yetkiler merkezden yönetilsin; dağınık kartvizit düzeni oluşmasın." },
];

const steps = [
  ["01", "Kapasiteyi seçin", "Ekip büyüklüğünüze uygun yıllık paketi seçin."],
  ["02", "Ekibi sisteme alın", "Çalışanlar, departmanlar, logo ve yetkiler tanımlansın."],
  ["03", "Kartları kullanıma açın", "NFC + QR kartlar çalışan profillerine bağlansın ve panelden yönetilsin."],
];

const employeeSpecimens = [
  { name: "Selin Kaya", role: "Satış Yöneticisi", status: "Aktif", action: "Kart Atandı", statusClass: "is-active" },
  { name: "Ahmet Demir", role: "Saha Ekibi", status: "Güncellendi", action: "Bilgiler Yenilendi", statusClass: "is-updated" },
  { name: "Zeynep Arslan", role: "Operasyon Müdürü", status: "Pasif", action: "Erişim Kapatıldı", statusClass: "is-disabled" },
];

export default async function CorporatePage({ searchParams }: { searchParams: Promise<{ plan?: string | string[] }> }) {
  const params = await searchParams;
  const selectedPlan = Array.isArray(params.plan) ? params.plan[0] : params.plan;

  return (
    <main id="main-content" className="theme-light corporate-page corporate-sales-page corporate-single-page">
      <CorporateHashScroll />
      <section className="corporate-single-hero corporate-authentic-hero" aria-labelledby="corporate-single-title">
        <div className="corporate-single-copy">
          <span className="section-kicker">YENOMI BUSINESS</span>
          <h1 id="corporate-single-title"><span className="corporate-hero-line">Çalışan kartlarını</span><span className="corporate-hero-line corporate-hero-line--accent">tek panelden yönetin.</span></h1>
          <p>Yeni çalışanı ekleyin, bilgileri güncelleyin, ayrılan personelin kartını kapatın. Marka standardı ve çalışan kartları tek merkezde kalsın.</p>
          <div className="corporate-hero-actions"><a href="#kapasite" className="corporate-cta">Paketleri Gör <span aria-hidden="true">→</span></a><a href="/kurumsal?plan=ENTERPRISE#teklif" className="home-mockup__link-secondary">100+ kişi için teklif al <span aria-hidden="true">→</span></a></div>
        </div>
        <aside className="corporate-authentic-proof corporate-hero-specimen" aria-label="Yenomi ID kurumsal yönetim ekranı örneği">
          <div className="corporate-authentic-proof__head"><div className="corporate-specimen-badge">MERKEZİ ÇALIŞAN YÖNETİMİ</div><strong>Çalışan durumunu ve kart erişimini tek yerden kontrol edin.</strong></div>
          <div className="corporate-specimen-table"><div className="corporate-specimen-table__header"><span>Çalışan</span><span>Ünvan</span><span>Durum</span><span>Aksiyon</span></div>{employeeSpecimens.map((employee) => <div key={employee.name} className="corporate-specimen-table__row"><div className="corporate-specimen-user"><span className="corporate-specimen-avatar">{employee.name[0]}</span><strong>{employee.name}</strong></div><span className="corporate-specimen-role">{employee.role}</span><span className={`corporate-specimen-status ${employee.statusClass}`}>{employee.status}</span><span className="corporate-specimen-action">{employee.action}</span></div>)}</div>
        </aside>
      </section>

      <section className="corporate-authentic-outcomes" aria-label="Kurumsal ürün sonuçları">{outcomes.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}</section>

      <section className="corporate-pricing-section corporate-single-details" id="kapasite" aria-labelledby="business-pricing-title">
        <div className="corporate-section-heading"><span className="section-kicker">YILLIK KURUMSAL SİSTEM</span><h2 id="business-pricing-title">Ekip büyüklüğünü seçin. Sistem aynı kalsın.</h2><p>Tüm paketlerde aynı kurumsal yönetim özellikleri bulunur. Değişen yalnızca kullanıcı ve dahil NFC kart sayısıdır.</p></div>
        <div className="corporate-renewal-alert" role="note" aria-label="Yenileme bilgisi"><Icon name="clock" /><div><strong>Yenileme ücreti satın alma anında alınmaz.</strong><span>Tablodaki yenileme fiyatı ilk 12 aylık kullanım tamamlandıktan sonra, 2. yıl başlarken geçerli olur.</span></div></div>
        <p className="corporate-pack-scroll-hint" aria-hidden="true">Tüm paketleri görmek için kaydırın →</p>
        <div className="corporate-pack-table-wrap" role="region" aria-label="Kurumsal kapasite ve fiyat tablosu" tabIndex={0}><table className="corporate-pack-table"><caption className="sr-only">Kurumsal kapasite ve fiyat listesi</caption><thead><tr><th scope="col">Ekip</th><th scope="col">Dahil</th><th scope="col" className="is-num">İlk yıl</th><th scope="col" className="is-num">2. yıl ve sonrası</th><th scope="col"><span className="sr-only">Aksiyon</span></th></tr></thead><tbody>{CORPORATE_PACKAGE_LADDER.map((plan) => { const isRecommended = plan.seats === 10; const renewal = corporateRenewalPriceKurus(plan.priceKurus, plan.seats); return <tr key={plan.code} className={isRecommended ? "is-recommended" : ""}><th scope="row"><div className="corporate-table-capacity-wrap"><span>{plan.seats} kişi</span>{isRecommended && <span className="corporate-tier-badge">En Çok Tercih Edilen</span>}</div></th><td>{plan.seats} kullanıcı + {plan.seats} NFC kart + kurumsal panel</td><td className="is-num corporate-price-primary"><strong>{formatTryFromKurus(plan.priceKurus)}</strong><span className="corporate-price-period"> / ilk yıl</span></td><td className="is-num corporate-price-secondary"><strong>{formatTryFromKurus(renewal)}</strong><span className="corporate-price-period"> / yıl</span></td><td className="is-action">{corporateCheckoutLive(plan.seats) ? <AddToCartButton productId={CORPORATE_PACKAGE_PRODUCT_SLUG} variantSku={corporatePackageSku(plan.code)} kind="BUSINESS_CARD" name={plan.name} unitPriceKurus={plan.priceKurus} label="Paketi Seç" appearance={isRecommended ? "primary" : "secondary"} className="corporate-plan-text" configuration={{ packageCode: plan.code, seatCount: plan.seats }} /> : <a href={`/kurumsal?plan=${plan.code}#teklif`} className="corporate-plan-text">Teklif Al</a>}</td></tr>; })}</tbody></table></div>
        <p className="corporate-pack-note"><strong>İlk 12 ay:</strong> seçilen kullanıcı sayısı kadar NFC kart, kurumsal platform erişimi ve Türkiye içi kargo dahildir. <strong>12 ay tamamlandıktan sonra:</strong> yenileme dönemi başlar; mevcut kartlar kullanılmaya devam eder ve yeni fiziksel kart gönderilmez.</p>
      </section>

      <section className="corporate-use-cases" id="senaryolar" aria-labelledby="corporate-use-cases-title"><div className="corporate-section-heading"><span className="section-kicker">NE YÖNETİRSİNİZ?</span><h2 id="corporate-use-cases-title">Kartı değil, çalışan sistemini yönetin.</h2></div><div className="corporate-use-case-grid">{useCases.map((item) => <article key={item.title}><Icon name={item.icon} /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></section>
      <section className="corporate-steps-section" id="kurulum" aria-labelledby="corporate-steps-title"><div className="corporate-section-heading"><span className="section-kicker">KURULUM</span><h2 id="corporate-steps-title">Üç adımda ekibiniz yayında.</h2></div><ol className="corporate-step-grid">{steps.map(([number,title,text]) => <li key={number}><span className="corporate-step-num">{number}</span><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
      <section className="corporate-lead-section" id="teklif" aria-labelledby="corporate-lead-title"><div className="corporate-lead-copy"><span className="section-kicker">100+ KİŞİ · ÖZEL KURULUM</span><h2 id="corporate-lead-title">Daha büyük ekipler için birlikte planlayalım.</h2><p>100+ çalışan, özel entegrasyon veya kuruma özel yapılandırma ihtiyacınızı paylaşın. Size uygun kurulum ve fiyatlandırmayla dönüş yapalım.</p><div className="corporate-lead-trust-signals"><span>1 iş günü içinde dönüş</span><span>Ödeme bilgisi istenmez</span><span>İhtiyaca göre yapılandırma</span></div></div><CorporateLeadForm plan={selectedPlan} /></section>
      <section className="corporate-final-cta" id="baslayin" aria-labelledby="corporate-final-title"><div className="corporate-final-cta__content"><span className="section-kicker">KURUMSAL BAŞLANGIÇ</span><h2 id="corporate-final-title">Ekibiniz için doğru kapasiteyi seçin.</h2><p>Özellik karşılaştırmak yerine yalnızca ekip büyüklüğünüzü belirleyin.</p></div><div className="corporate-final-cta__actions"><a href="#kapasite" className="corporate-cta">Paketleri Gör <span aria-hidden="true">→</span></a><a href="/kurumsal?plan=ENTERPRISE#teklif" className="home-mockup__link-secondary">100+ kişi için teklif al <span aria-hidden="true">→</span></a></div></section>
    </main>
  );
}
