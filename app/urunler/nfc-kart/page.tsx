import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { COMMERCIAL_COPY } from "../../../lib/config/commercial";
import { NFC_PRODUCT, formatTryFromKurus } from "../../../lib/config/product";
import NfcPurchasePanel from "./NfcPurchasePanel";
import { PublicPageTitle } from "../../components/PublicPageTitle";

export const metadata: Metadata = {
  title: "NFC + QR Kart",
  description: "Premium fiziksel NFC + QR kart ve güncellenebilir Yenomi ID dijital kartvizit.",
};

const benefits = [
  ["01", "NFC", "NFC destekli telefonlarda tek dokunuşla profilini aç."],
  ["02", "QR", "NFC kullanılamadığında aynı kalıcı profile QR ile ulaş."],
  ["03", "Sabit bağlantı", "Kartı yeniden bastırmadan profilindeki bilgileri güncelle."],
  ["04", "1 yıllık kullanım", "İlk satın alma bedeline dijital profil hizmeti dahildir."],
];

const steps = [
  ["01", "Kartını seç", "Siyah, beyaz veya Yenomi moru."],
  ["02", "Teslimat ve ödemeyi tamamla", "Kargo dahil fiyatla Türkiye içi sipariş ver."],
  ["03", "Profilini etkinleştir", "Bilgilerini ekle; NFC ve QR aynı sayfaya bağlansın."],
];

const faq = [
  [`${COMMERCIAL_COPY.initialPrice}’ye tam olarak ne dahil?`, "1 adet kişiselleştirilmiş NFC + QR kart, aynı karta bağlı dijital kartvizit, 1 yıllık dijital hizmet ve Türkiye içi ücretsiz kargo dahildir."],
  ["Kart kaç günde hazırlanır?", "Profil ve sipariş bilgileriniz tamamlandıktan sonra kartınız 2 iş günü içinde hazırlanıp kargoya teslim edilir. Kargo firmasının teslim süresi bu süreye dahil değildir."],
  ["Kargo dahil mi?", "Evet. Türkiye içi standart kargo ürün fiyatına dahildir. Şimdilik Türkiye dışına sipariş alınmamaktadır."],
  ["İlk yıl dijital hizmet fiyata dahil mi?", "Evet. Satın alma bedeli dijital kartvizit sayfasının 1 yıllık dijital hizmetini kapsar."],
  ["Süre dolunca ne olur?", `Mevcut fiziksel kartınızı yeniden satın almadan dijital hizmetinizi ${COMMERCIAL_COPY.renewalPrice}/yıl karşılığında yenileyebilirsiniz. Kartınız ve profil bağlantınız değişmez.`],
  ["Bilgilerimi kaç kez değiştirebilirim?", "Aktif kullanım süreniz boyunca telefon, unvan, şirket, sosyal medya, web sitesi ve diğer profil bilgilerinizi istediğiniz kadar güncelleyebilirsiniz."],
  ["NFC her telefonda çalışır mı?", "NFC destekli çoğu modern telefonda kartı yaklaştırarak profil açılır. NFC kapalıysa veya cihaz NFC desteklemiyorsa kart üzerindeki QR kod kullanılabilir."],
  ["QR kodum değişir mi?", "Hayır. Kart üzerindeki QR kod ve profil bağlantısı sabit kalır. Sayfadaki bilgiler değişse bile kartı yeniden bastırmanız gerekmez."],
  ["Kartımı kaybedersem ne olur?", "Hesabınızdan kartı kayıp moduna alabilirsiniz. Kayıp kart güvenli bir bilgilendirme sayfasına yönlenir; bulunmazsa aynı profile bağlı yedek kart sipariş edilebilir."],
  ["İkinci veya yedek kart ne kadar?", `Aynı dijital profile bağlı 1 fiziksel NFC + QR ek/yedek kart ${COMMERCIAL_COPY.additionalCardPrice}’dir. Türkiye içi kargo dahildir; yeni profil veya yeni yıllık dijital hizmet süresi başlatmaz.`],
];

export default function NfcKartPage() {
  return (
    <main id="main-content" className="nfc-product-page">
      <PublicPageTitle
        kicker="YENOMI ID · NFC + QR KART"
        title={<>Fiziksel kart.<br /><em>Canlı dijital kimlik.</em></>}
        description="Premium NFC + QR kart, güncellenebilir dijital profil ve tek kalıcı bağlantı. Kartın fiziksel; kimliğin her zaman güncel."
        className="public-page-title--product"
      />
      <section className="nfc-product-hero">
        <div className="yi-container nfc-product-hero__grid">
          <div className="nfc-product-hero__copy">
            <span className="nfc-kicker">ÜRÜNÜNÜ SEÇ</span>
            <h2>Yenomi ID<br /><em>NFC + QR Kart</em></h2>
            <p className="nfc-product-hero__body">Kartını telefona yaklaştır veya QR kodunu okut; profilin tarayıcıda açılsın. İletişim bilgilerin değiştiğinde kartı yeniden bastırmadan hesabından güncelle.</p>
            <NfcPurchasePanel product={NFC_PRODUCT} />
          </div>
          <div className="nfc-product-hero__visual" aria-label="Yenomi ID NFC kart ve dijital profil">
            <Image src="/images/nfc-kart-hero.png" alt="Yenomi ID NFC kart ve dijital profil" width={1200} height={1200} priority />
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
          <div><span className="nfc-kicker">SATIN AL, ETKİNLEŞTİR, PAYLAŞ</span><h2>Önce ürününü al.<br /><em>Sonra profilini kur.</em></h2></div>
          <p>Ürünü sepete ekle, Türkiye içi teslimat adresini gir ve ödemenin ardından hesabını etkinleştir. NFC ve QR aynı kalıcı dijital profile bağlanır.</p>
        </div>
        <div className="yi-container nfc-steps">
          {steps.map(([number,title,text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="nfc-includes">
        <div className="yi-container nfc-includes__grid">
          <div><span className="nfc-kicker">NE SATIN ALIYORSUN?</span><h2>Karttan fazlası.<br /><em>Abonelikten daha somut.</em></h2></div>
          <ul><li>1 adet kişisel NFC kart</li><li>Değişmeyen kişisel QR kod</li><li>1 yıllık dijital kartvizit sayfası</li><li>Aktif dönemde sınırsız bilgi güncelleme</li><li>Kayıp modu ve yedek kart desteği</li><li>Türkiye içi standart kargo dahil</li></ul>
          <div className="nfc-includes__cta"><span>Kargo dahil paket fiyatı</span><strong>{formatTryFromKurus(NFC_PRODUCT.unitPriceKurus)}</strong><small>1 kart • 1 yıllık sayfa • Türkiye içi teslimat</small><Link href="#nfc-hero-price-row">Hemen Satın Al →</Link></div>
        </div>
      </section>

      <section className="nfc-faq">
        <div className="yi-container"><span className="nfc-kicker">SIK SORULAN SORULAR</span><h2>Satın almadan önce<br /><em>bilmen gerekenler.</em></h2><p className="nfc-faq__intro">Karar vermeden önce fiyat, teslimat, yıllık kullanım, uyumluluk ve kayıp kart sürecini netleştir.</p>
          <div className="nfc-faq__list">{faq.map(([q,a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </div>
      </section>

      <section className="nfc-final">
        <div className="yi-container"><span className="nfc-kicker">ŞİMDİ BAŞLA</span><h2>Fiziksel kart.<br /><em>Canlı dijital kimlik.</em></h2><p>İlk paket {formatTryFromKurus(NFC_PRODUCT.unitPriceKurus)} ve 1 yıllık dijital hizmet içerir.</p><Link href="#nfc-hero-price-row">NFC Kartını Sepete Ekle →</Link></div>
      </section>
    </main>
  );
}
