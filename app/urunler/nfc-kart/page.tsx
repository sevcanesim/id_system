import type { Metadata } from "next";
import { COMMERCIAL_COPY } from "../../../lib/config/commercial";
import { NFC_PRODUCT } from "../../../lib/config/product";
import NfcPurchasePanel from "./NfcPurchasePanel";
import NfcIncludesPanel from "./NfcIncludesPanel";
import { NfcPackageProvider } from "./NfcPackageContext";
import { PublicPageTitle } from "../../components/PublicPageTitle";
import { YenomiProductVisual } from "../../ui/YenomiProductVisual";

export const metadata: Metadata = {
  title: "NFC + QR Kart",
  description: "Yenomi ID Premium NFC + QR kart, canlı dijital profil ve networking araçları. İlk yıl platform erişimi ve Türkiye içi kargo dahil.",
};

const benefits = [
  ["NFC", "Tek dokunuşla aç"],
  ["QR", "Her telefonda alternatif"],
  ["Sabit bağlantı", "Bilgin değişir, kartın kalır"],
  ["İlk yıl", "Platform erişimi dahil"],
];

const faq = [
  [`Premium ${COMMERCIAL_COPY.premiumPrice}’ye ne dahil?`, "1 kişiselleştirilmiş NFC + QR kart, canlı dijital profil, kişi yönetimi, toplantı ve sunum araçları, 100 Network Mail kredisi, ilk yıl Premium erişimi ve Türkiye içi standart kargo dahildir."],
  ["2. yılda ne öderim?", `Premium erişimi ${COMMERCIAL_COPY.premiumRenewalPrice}/yıl, Bireysel erişimi ${COMMERCIAL_COPY.renewalPrice}/yıl üzerinden yenilenir. Yenilemede yeni fiziksel kart gönderilmez; mevcut kartın ve QR bağlantın kullanılmaya devam eder.`],
  ["Kart kaç günde hazırlanır?", "Sipariş ve profil bilgileriniz tamamlandıktan sonra kartınız 2 iş günü içinde hazırlanıp kargoya teslim edilir."],
  ["Bilgilerimi değiştirebilir miyim?", "Evet. Aktif kullanım süren boyunca telefon, unvan, şirket, bağlantılar ve diğer profil bilgilerini istediğin kadar güncelleyebilirsin."],
  ["NFC her telefonda çalışır mı?", "NFC destekli çoğu modern telefonda çalışır. NFC kapalıysa veya desteklenmiyorsa kart üzerindeki sabit QR kod kullanılabilir."],
  ["Kartımı kaybedersem ne olur?", "Panelden kartı kayıp moduna alabilirsin. Gerekirse aynı profile bağlı yedek kart sipariş edebilirsin."],
  ["Yedek kart ne kadar?", `Aynı profile bağlı fiziksel NFC + QR yedek kart ${COMMERCIAL_COPY.additionalCardPrice}’dir. Yeni profil veya yeni yıllık hizmet süresi başlatmaz.`],
];

export default async function NfcKartPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string | string[]; reason?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawPackage = Array.isArray(params.paket) ? params.paket[0] : params.paket;
  const initialPackage = rawPackage === "individual" ? "individual" : "premium";
  const rawReason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const accessRequired = rawReason === "access-required";

  return (
    <NfcPackageProvider initialPackage={initialPackage}>
      <main id="main-content" className="nfc-product-page">
        <PublicPageTitle
          kicker="YENOMI ID · NFC + QR KART"
          title={<>Kart bir kez basılır.<br />Kimliğin her gün güncel kalır.</>}
          description="NFC veya QR ile paylaş. Bilgilerin değişince kartı yenileme; kaybolursa panelden kapat. Premium ile tanıştığın kişileri ve takibini de tek yerde yönet."
          className="public-page-title--product"
        />

        <section className="nfc-product-hero">
          <div className="yi-container nfc-product-hero__grid">
            <div className="nfc-product-hero__copy">
              <span className="nfc-kicker">PAKETİNİ SEÇ</span>
              <p className="nfc-product-hero__body">Premium önerilen paket. Yalnızca güncellenebilir NFC + QR kartvizit istiyorsan Bireysel’i seçebilirsin.</p>
              <NfcPurchasePanel product={NFC_PRODUCT} accessRequired={accessRequired} />
            </div>
            <div className="nfc-product-hero__visual">
              <div className="home-hero-specimens">
                <YenomiProductVisual variant="card" finish="matte" />
                <YenomiProductVisual variant="profile" compact />
              </div>
            </div>
          </div>
        </section>

        <section className="nfc-benefits" aria-label="Ürün özellikleri">
          <div className="yi-container nfc-benefits__grid">
            {benefits.map(([title, text]) => <article key={title}><h2>{title}</h2><p>{text}</p></article>)}
          </div>
        </section>

        <NfcIncludesPanel />

        <section className="nfc-faq">
          <div className="yi-container">
            <span className="nfc-kicker">SATIN ALMADAN ÖNCE</span>
            <h2>Kısa cevaplar.</h2>
            <div className="nfc-faq__list">
              {faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
            </div>
          </div>
        </section>

        <div id="nfc-page-end-sentinel" aria-hidden="true" />
      </main>
    </NfcPackageProvider>
  );
}
