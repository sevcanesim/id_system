import type { Metadata } from "next";
import { Icon } from "../icons";
import AddToCartButton from "../components/AddToCartButton";
import {
  CORPORATE_PACKAGE_LADDER,
  CORPORATE_PACKAGE_PRODUCT_SLUG,
  corporateCheckoutLive,
  corporatePackageSku,
  corporateRenewalPriceKurus,
  networkMailGrant,
} from "../../lib/commerce/packages";
import { formatTryFromKurus } from "../../lib/config/product";
import CorporateLeadForm from "./CorporateLeadForm";

export const metadata: Metadata = {
  title: "Yenomi Business · Ekibiniz Her Tanışmada Aynı Standardı Taşısın",
  description: "Çalışan NFC kartları, canlı profiller, yetkiler ve marka standardı; ekibiniz büyürken tek merkezden yönetilir.",
};

const outcomes = [
  { value: "Tek merkez", label: "Çalışan, kart ve profil yönetimi" },
  { value: "Anında kontrol", label: "Bilgi güncelleme ve erişim kapatma" },
  { value: "Tek standart", label: "Her ekip üyesinde aynı marka deneyimi" },
];

const useCases = [
  {
    icon: "users" as const,
    title: "Satış ve saha ekipleri",
    text: "Her çalışan aynı kurumsal görünümle paylaşır; iletişim ve şirket bağlantıları tek bir canlı profilde kalır.",
  },
  {
    icon: "building" as const,
    title: "İK ve yönetim",
    text: "Yeni çalışanı ekleyin, unvan ve departmanı güncelleyin; ayrılan personelin erişimini tek yerden kapatın.",
  },
  {
    icon: "shield" as const,
    title: "Marka kontrolü",
    text: "Logo, renk, görünür alanlar ve yetkiler merkezden yönetilir; her kartta aynı güven veren marka deneyimi kalır.",
  },
];

const steps = [
  ["01", "Ekibinize uygun planı seçin", "Bugünkü ekip büyüklüğünüz için net bir yıllık kapasiteyle başlayın."],
  ["02", "Marka standardınızı kurun", "Çalışanlar, departmanlar, logo ve yetkiler tek merkezde tanımlansın."],
  ["03", "Ekibinizi hazır edin", "NFC + QR kartlar çalışan profillerine bağlansın; her tanışma aynı standardı taşısın."],
];

const employeeSpecimens = [
  { name: "Selin Kaya", role: "Satış Yöneticisi", status: "Aktif", action: "Kart Atandı", statusClass: "is-active" },
  { name: "Ahmet Demir", role: "Saha Ekibi", status: "Güncellendi", action: "Bilgiler Yenilendi", statusClass: "is-updated" },
  { name: "Zeynep Arslan", role: "Operasyon Müdürü", status: "Pasif", action: "Erişim Kapatıldı", statusClass: "is-disabled" },
];

const pricingTiers = [
  {
    name: "Start",
    range: "2–5 kişi",
    copy: "Küçük ekipler için merkezi başlangıç. 2, 3 veya 5 kişilik kapasiteyle başlayın.",
    href: "#plan-corp-2",
  },
  {
    name: "Business",
    range: "10–25 kişi",
    copy: "Büyüyen ekipler için dengeli kapasite. 10 veya 25 kişilik paketi seçin.",
    href: "#plan-corp-10",
    popular: true,
  },
  {
    name: "Enterprise",
    range: "50+ kişi",
    copy: "Büyük organizasyonlar için 50 ve 100 kişilik paketler; 100+ ekipler için özel kurulum.",
    href: "#plan-corp-50",
  },
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
      <section className="corporate-single-hero corporate-authentic-hero" aria-labelledby="corporate-single-title">
        <div className="corporate-single-copy">
          <span className="section-kicker">YENOMI BUSINESS · KURUMSAL DİJİTAL KİMLİK</span>
          <h1 id="corporate-single-title">
            <span className="corporate-hero-line">Her çalışanınız</span>
            <span className="corporate-hero-line corporate-hero-line--accent">markanızın standardını taşısın.</span>
          </h1>
          <p>
            NFC + QR kartlar, canlı profiller ve yetkiler tek merkezde. Ekip değişse de markanızın ilk izlenimi her
            zaman tutarlı kalsın.
          </p>
          <div className="corporate-hero-actions">
            <a href="#kapasite" className="corporate-cta">
              Ekibiniz için doğru planı seçin <span aria-hidden="true">→</span>
            </a>
            <a href="/kurumsal?plan=ENTERPRISE#teklif" className="home-mockup__link-secondary">
              100+ kişi için özel kurulum planlayın <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        <aside className="corporate-authentic-proof corporate-hero-specimen" aria-label="Yenomi ID kurumsal yönetim ekranı örneği">
          <div className="corporate-authentic-proof__head">
            <div className="corporate-specimen-badge">MERKEZİ EKİP YÖNETİMİ</div>
            <strong>Çalışan durumunu, kart erişimini ve marka standardını tek yerden koruyun.</strong>
          </div>
          <div className="corporate-specimen-table">
            <div className="corporate-specimen-table__header">
              <span>Çalışan</span>
              <span>Ünvan</span>
              <span>Durum</span>
              <span>Aksiyon</span>
            </div>
            {employeeSpecimens.map((employee) => (
              <div key={employee.name} className="corporate-specimen-table__row">
                <div className="corporate-specimen-user">
                  <span className="corporate-specimen-avatar">{employee.name[0]}</span>
                  <strong>{employee.name}</strong>
                </div>
                <span className="corporate-specimen-role">{employee.role}</span>
                <span className={`corporate-specimen-status ${employee.statusClass}`}>{employee.status}</span>
                <span className="corporate-specimen-action">{employee.action}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="corporate-authentic-outcomes" aria-label="Kurumsal ürün sonuçları">
        {outcomes.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="corporate-pricing-section corporate-single-details" id="kapasite" aria-labelledby="business-pricing-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">YILLIK KURUMSAL SİSTEM</span>
          <h2 id="business-pricing-title">Ekibiniz büyürken marka standardınız dağılmasın.</h2>
          <p>
            Her kapasitede aynı kurumsal yönetim standardı var. Özellik karşılaştırmak yerine yalnızca ekibiniz için
            doğru ölçeği seçin.
          </p>
        </div>

        <div className="corporate-pack-picker__tiers" aria-label="Kurumsal paket ölçekleri">
          {pricingTiers.map((tier) => (
            <a
              key={tier.name}
              href={tier.href}
              className={`corporate-pack-picker__tier${tier.popular ? " is-popular" : ""}`}
              aria-label={`${tier.name}: ${tier.range}`}
            >
              <span className="corporate-pack-picker__tier-status">{tier.popular ? "En çok tercih edilen" : "Kurumsal ölçek"}</span>
              <span className="corporate-pack-picker__tier-name">{tier.name}</span>
              <span className="corporate-pack-picker__tier-copy">{tier.range}</span>
              <span className="corporate-pack-picker__tier-copy">{tier.copy}</span>
            </a>
          ))}
        </div>

        <div className="corporate-renewal-alert ds-pricing-card" role="note" aria-label="Yenileme bilgisi">
          <Icon name="clock" />
          <div>
            <strong>İlk yıl için tek net fiyat.</strong>
            <span>Yenileme bedeli bugün alınmaz; ilk 12 aylık kullanım tamamlandığında, ikinci yıl başında geçerli olur.</span>
          </div>
        </div>

        <p className="corporate-pack-scroll-hint" aria-hidden="true">
          Tüm planları görmek için kaydırın →
        </p>

        <div className="corporate-pack-table-wrap" role="region" aria-label="Kurumsal kapasite ve fiyat tablosu" tabIndex={0}>
          <table className="corporate-pack-table">
            <caption className="sr-only">Kurumsal kapasite ve fiyat listesi</caption>
            <thead>
              <tr>
                <th scope="col">Ekip</th>
                <th scope="col">Dahil</th>
                <th scope="col" className="is-num">İlk yıl</th>
                <th scope="col" className="is-num">2. yıl ve sonrası</th>
                <th scope="col"><span className="sr-only">Aksiyon</span></th>
              </tr>
            </thead>
            <tbody>
              {CORPORATE_PACKAGE_LADDER.map((plan) => {
                const isRecommended = plan.seats === 10;
                const renewal = corporateRenewalPriceKurus(plan.priceKurus, plan.seats);
                return (
                  <tr
                    key={plan.code}
                    id={`plan-${plan.code.toLowerCase()}`}
                    className={isRecommended ? "is-recommended" : ""}
                  >
                    <th scope="row">
                      <div className="corporate-table-capacity-wrap">
                        <span>{plan.seats} kişi</span>
                        {isRecommended && <span className="corporate-tier-badge">En Çok Tercih Edilen</span>}
                      </div>
                    </th>
                    <td data-label="Dahil olanlar">
                      {plan.seats} kullanıcı + {plan.seats} NFC kart + kurumsal panel
                      <br />
                      <small>{networkMailGrant(plan.seats).toLocaleString("tr-TR")} Network Mail kredisi / yıl dahil</small>
                    </td>
                    <td className="is-num corporate-price-primary" data-label="İlk yıl">
                      <strong>{formatTryFromKurus(plan.priceKurus)}</strong>
                      <span className="corporate-price-period"> / ilk yıl</span>
                    </td>
                    <td className="is-num corporate-price-secondary" data-label="Yıllık yenileme">
                      <strong>{formatTryFromKurus(renewal)}</strong>
                      <span className="corporate-price-period"> / yıl</span>
                    </td>
                    <td className="is-action" data-label="">
                      {corporateCheckoutLive(plan.seats) ? (
                        <AddToCartButton
                          productId={CORPORATE_PACKAGE_PRODUCT_SLUG}
                          variantSku={corporatePackageSku(plan.code)}
                          kind="BUSINESS_CARD"
                          name={plan.name}
                          unitPriceKurus={plan.priceKurus}
                          label={`${plan.seats} kişilik planı seç`}
                          appearance={isRecommended ? "primary" : "secondary"}
                          className="corporate-plan-text"
                          configuration={{ packageCode: plan.code, seatCount: plan.seats }}
                        />
                      ) : (
                        <a href={`/kurumsal?plan=${plan.code}#teklif`} className="corporate-plan-text">Kurulumu birlikte planla</a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="corporate-pack-note">
          <strong>İlk 12 ay:</strong> seçilen kullanıcı sayısı kadar NFC kart, kurumsal platform erişimi, Türkiye içi kargo
          ve kişi başı 100 Network Mail kredisi dahildir. <strong>12 ay sonunda:</strong> yenileme dönemi başlar; mevcut kartlar kullanılmaya devam eder, yeni fiziksel kart gönderilmez.
        </p>
      </section>

      <section className="corporate-use-cases" id="senaryolar" aria-labelledby="corporate-use-cases-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">NE YÖNETİRSİNİZ?</span>
          <h2 id="corporate-use-cases-title">Kartı değil, ekibinizin bıraktığı standardı yönetin.</h2>
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

      <section className="corporate-steps-section" id="kurulum" aria-labelledby="corporate-steps-title">
        <div className="corporate-section-heading">
          <span className="section-kicker">KURULUM</span>
          <h2 id="corporate-steps-title">Üç net adımda ekip kimliğiniz hazır.</h2>
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

      <section className="corporate-lead-section" id="teklif" aria-labelledby="corporate-lead-title">
        <div className="corporate-lead-copy">
          <span className="section-kicker">100+ KİŞİ · ÖZEL KURULUM</span>
          <h2 id="corporate-lead-title">Daha büyük ekibiniz için doğru standardı birlikte kuralım.</h2>
          <p>
            100+ çalışan, özel entegrasyon veya kuruma özel yapılandırma ihtiyacınızı paylaşın. Ekibiniz için doğru
            kurulum ve net fiyatlandırma seçeneğiyle geri dönelim.
          </p>
          <div className="corporate-lead-trust-signals">
            <span>1 iş günü içinde dönüş</span>
            <span>Ödeme bilgisi istenmez</span>
            <span>İhtiyacınıza göre net kurulum</span>
          </div>
        </div>
        <CorporateLeadForm plan={selectedPlan} />
      </section>

      <section className="corporate-final-cta" id="baslayin" aria-labelledby="corporate-final-title">
        <div className="corporate-final-cta__content">
          <span className="section-kicker">KURUMSAL BAŞLANGIÇ</span>
          <h2 id="corporate-final-title">Ekibiniz için doğru standardı bugün kurun.</h2>
          <p>Özellik karşılaştırmak yerine, ekibinizin bugün ihtiyacı olan ölçeği seçin.</p>
        </div>
        <div className="corporate-final-cta__actions">
          <a href="#kapasite" className="corporate-cta">
            Ekibim için planı seç <span aria-hidden="true">→</span>
          </a>
          <a href="/kurumsal?plan=ENTERPRISE#teklif" className="home-mockup__link-secondary">
            100+ kişi için özel kurulum planla <span aria-hidden="true">→</span>
          </a>
        </div>
      </section>
    </main>
  );
}
