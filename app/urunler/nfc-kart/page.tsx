import type { Metadata } from "next";
import Link from "next/link";
import { ProductVisual } from "../../ui/ProductVisual";
import { COMMERCIAL_COPY } from "../../../lib/config/commercial";
import { NFC_PRODUCT, formatTryFromKurus } from "../../../lib/config/product";
import NfcPurchasePanel from "./NfcPurchasePanel";
import { PublicPageTitle } from "../../components/PublicPageTitle";

export const metadata: Metadata = {
  title: "NFC + QR Kart",
  description: "Premium NFC + QR kart. Unvanın değişince baskı yok; kaybolursa kapatırsın. 1 yıl dijital hizmet ve Türkiye içi kargo dahil. Kart numarası iyzico’da kalır.",
};

const benefits = [
  ["01", "NFC", "NFC destekli telefonlarda tek dokunuşla profilini aç."],
  ["02", "QR", "NFC kullanılamadığında aynı kalıcı profile QR ile ulaş."],
  ["03", "Sabit bağlantı", "Kartı yeniden bastırmadan profilindeki bilgileri güncelle."],
  ["04", "1 yıllık kullanım", "İlk satın alma bedeline dijital profil hizmeti dahildir."],
];

const steps = [
  ["01", "Kartını seç", "Siyah mat NFC + QR kart."],
  ["02", "Teslimat ve ödemeyi tamamla", "Kargo dahil fiyatla Türkiye içi sipariş ver."],
  ["03", "Profilini etkinleştir", "Bilgilerini ekle; NFC ve QR aynı sayfaya bağlansın."],
];

const faq = [
  [`${COMMERCIAL_COPY.initialPrice}’ye tam olarak ne dahil?`, "1 adet kişiselleştirilmiş NFC + QR kart, aynı karta bağlı dijital kartvizit, 1 yıllık dijital hizmet ve Türkiye içi ücretsiz kargo dahildir."],
  [`Bireysel Premium ${COMMERCIAL_COPY.premiumPrice} neden farklı?`, "Premium, bireysel paketteki her şeyi içerir; ayrıca toplantı, sunum, kişi yönetimi ve 100 Network Mail kredisi verir. Kredi ödeme sonrası hesabına yazılır."],
  ["Kart kaç günde hazırlanır?", "Profil ve sipariş bilgileriniz tamamlandıktan sonra kartınız 2 iş günü içinde hazırlanıp kargoya teslim edilir. Kargo firmasının teslim süresi bu süreye dahil değildir."],
  ["Kargo dahil mi?", "Evet. Türkiye içi standart kargo ürün fiyatına dahildir. Şimdilik Türkiye dışına sipariş alınmamaktadır."],
  ["İlk yıl dijital hizmet fiyata dahil mi?", "Evet. Satın alma bedeli dijital kartvizit sayfasının 1 yıllık dijital hizmetini kapsar."],
  ["Süre dolunca ne olur?", `Bireysel hizmet ${COMMERCIAL_COPY.renewalPrice}/yıl, Bireysel Premium ${COMMERCIAL_COPY.premiumRenewalPrice}/yıl yenilenir. Yeni kart gönderilmez. Premium’da kullanılmayan Network Mail bir sonraki yıla taşınır.`],
  ["Bilgilerimi kaç kez değiştirebilirim?", "Aktif kullanım süreniz boyunca telefon, unvan, şirket, sosyal medya, web sitesi ve diğer profil bilgilerinizi istediğiniz kadar güncelleyebilirsiniz."],
  ["NFC her telefonda çalışır mı?", "NFC destekli çoğu modern telefonda kartı yaklaştırarak profil açılır. NFC kapalıysa veya cihaz NFC desteklemiyorsa kart üzerindeki QR kod kullanılabilir."],
  ["QR kodum değişir mi?", "Hayır. Kart üzerindeki QR kod ve profil bağlantısı sabit kalır. Sayfadaki bilgiler değişse bile kartı yeniden bastırmanız gerekmez."],
  ["Kartımı kaybedersem ne olur?", "Hesabınızdan kartı kayıp moduna alabilirsiniz. Kayıp kart güvenli bir bilgilendirme sayfasına yönlenir; bulunmazsa aynı profile bağlı yedek kart sipariş edilebilir."],
  ["İkinci veya yedek kart ne kadar?", `Aynı dijital profile bağlı 1 fiziksel NFC + QR ek/yedek kart ${COMMERCIAL_COPY.additionalCardPrice}’dir. Türkiye içi kargo dahildir; yeni profil veya yeni yıllık dijital hizmet süresi başlatmaz.`],
];

export default async function NfcKartPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string | string[]; reason?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawPackage = Array.isArray(params.paket) ? params.paket[0] : params.paket;
  const initialPackage = rawPackage === "premium" ? "premium" : "individual";
  const rawReason = Array.isArray(params.reason) ? params.reason[0] : params.reason;
  const accessRequired = rawReason === "access-required";
  return (
    <main id="main-content" className="nfc-product-page">
      <PublicPageTitle
        kicker="YENOMI ID · NFC + QR KART"
        title={<>Kart bir kez basılır.<br /><em>Kimliğin her gün güncel kalır.</em></>}
        description="NFC veya QR ile paylaş. Unvanın değişince kartı yenileme. Kaybolursa kayıp modu. Ödeme iyzico güvencesinde; kart numarası Yenomi’de saklanmaz."
        className="public-page-title--product"
      />
      <section className="nfc-product-hero">
        <div className="yi-container nfc-product-hero__grid">
          <div className="nfc-product-hero__copy">
            <span className="nfc-kicker">KARTINI SEÇ</span>
            <p className="nfc-product-hero__body">Kartı telefona yaklaştır veya QR’ı okut. Profil tarayıcıda açılır. Bilgin değişince baskı yok; kart kaybolursa panelden kapatırsın.</p>
            <NfcPurchasePanel product={NFC_PRODUCT} initialPackage={initialPackage} accessRequired={accessRequired} />
          </div>
          <div className="nfc-product-hero__visual" aria-label="Yenomi ID NFC kart örneği, ön ve arka yüz">
            <ProductVisual pair />
          </div>
        </div>
      </section>

      <section className="nfc-benefits" aria-label="Ürün özellikleri">
        <div className="yi-container nfc-benefits__grid">
          {benefits.map(([number,title,text]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{text}</p></article>)}
        </div>
      </section>

      <section className="nfc-story">
        <div className="yi-container nfc-story__inner">
          <div><span className="nfc-kicker">SEÇ, BAĞLA, PAYLAŞ</span><h2>Önce kartını al.<br /><em>Sonra profilin açılır.</em></h2></div>
          <p>Sepete ekle, Türkiye içi adresi yaz, öde. Hesabın varsa sipariş bağlanır; yoksa hesap açmadan tamamlarsın. NFC ve QR aynı kalıcı profile gider.</p>
        </div>
        <div className="yi-container nfc-steps">
          {steps.map(([number,title,text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="nfc-includes">
        <div className="yi-container nfc-includes__grid">
          <div><span className="nfc-kicker">NE ALIYORSUN?</span><h2>Karttan fazlası.<br /><em>Kimliğin sende kalır.</em></h2></div>
          <ul><li>1 adet kişisel NFC kart</li><li>Değişmeyen kişisel QR kod</li><li>1 yıllık dijital kartvizit sayfası</li><li>Aktif dönemde sınırsız bilgi güncelleme</li><li>Kayıp modu ve yedek kart desteği</li><li>Türkiye içi standart kargo dahil</li></ul>
          <div className="nfc-includes__cta"><span>Kargo dahil paket fiyatı</span><strong>{formatTryFromKurus(NFC_PRODUCT.unitPriceKurus)}</strong><small>1 kart • 1 yıllık sayfa • Türkiye içi teslimat</small><Link href="#nfc-hero-price-row">Hemen Satın Al</Link></div>
        </div>
      </section>

      <section className="nfc-faq">
        <div className="yi-container"><span className="nfc-kicker">SIK SORULAN SORULAR</span><h2>Satın almadan önce<br /><em>bilmen gerekenler.</em></h2><p className="nfc-faq__intro">Fiyat, kargo, yıllık kullanım, NFC uyumu ve kayıp kart. Karar bundan sonra net.</p>
          <div className="nfc-faq__list">{faq.map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>

      <section className="nfc-final">
          <div className="yi-container"><span className="nfc-kicker">ŞİMDİ BAŞLA</span><h2>Bir sonraki tanışmada<br /><em>güncel ol.</em></h2><p>İlk paket {formatTryFromKurus(NFC_PRODUCT.unitPriceKurus)}. 1 yıl dijital hizmet ve Türkiye içi kargo dahil.</p><Link href="#nfc-hero-price-row">Sepete Ekle</Link></div>
      </section>
    </main>
  );
}
