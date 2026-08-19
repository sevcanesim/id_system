import Link from "next/link";
import type { Metadata } from "next";
import { getLegalIdentity } from "../../lib/config/legal-identity";
import { PublicPageTitle } from "../components/PublicPageTitle";

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu",
  description: "Yenomi ID NFC kart siparişleri için mesafeli satış sözleşmesi ve ön bilgilendirme formu.",
};

export default function MesafeliSatisPage() {
  const legal = getLegalIdentity();
  return (
    <main id="main-content" className="legal-page">
      <PublicPageTitle
        kicker="YENOMI ID · SATIŞ SÖZLEŞMESİ"
        title="Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu"
        description="Yenomi ID NFC kart siparişleri için satış, ödeme, teslimat ve tarafların hak ve yükümlülükleri."
        backHref="/"
      />
      <div className="legal-shell">
        <p className="legal-updated">
          Yürürlük tarihi: {legal.effectiveDate}. NFC kart siparişi verdiğinizde bu sözleşmenin yürürlükteki sürümü onayınıza sunulur.
        </p>

        <section>
          <h2>1. Taraflar</h2>
          <p>
            <strong>Satıcı:</strong> {legal.tradeName}, {legal.address}, Vergi Dairesi: {legal.taxOffice}, Vergi No: {legal.taxNumber}, MERSİS No: {legal.mersisNumber}, Yetkili: {legal.authorizedPerson}, Telefon: {legal.phone}, E-posta: {legal.email} (&ldquo;Satıcı&rdquo;).<br />
            <strong>Alıcı:</strong> Sipariş sırasında bilgileri girilen, Yenomi ID hesabı üzerinden sipariş
            veren kişi (&ldquo;Alıcı&rdquo;/&ldquo;Tüketici&rdquo;).
          </p>
        </section>

        <section>
          <h2>2. Sözleşmenin Konusu</h2>
          <p>
            İşbu sözleşmenin konusu, Alıcı&apos;nın Yenomi ID platformu üzerinden elektronik ortamda
            sipariş verdiği kişiselleştirilmiş NFC kartvizit ürününün (&ldquo;Ürün&rdquo;) satışı ve
            teslimine ilişkin tarafların hak ve yükümlülüklerinin belirlenmesidir. Ürünün temel nitelikleri
            (adet, renk, fiyat) sipariş ekranında ve elektronik postayla Alıcı&apos;ya bildirilir.
          </p>
        </section>

        <section>
          <h2>3. Fiyat ve Ödeme</h2>
          <p>
            Ürün bedeli, sipariş anında ekranda gösterilen ve iyzico güvenli ödeme altyapısı üzerinden
            tahsil edilen tutardır. Kargo, aksi belirtilmedikçe Türkiye geneli ücretsizdir. Fiyata yasal
            KDV dahildir.
          </p>
        </section>

        <section>
          <h2>4. Teslimat</h2>
          <p>
            Ürün, sipariş onayında belirtilen adrese, ödeme onaylandıktan sonra anlaşmalı kargo firması
            aracılığıyla makul süre içinde gönderilir. Teslimat süresi sipariş takip ekranında ve
            e-postayla bildirilir. Mücbir sebep hâllerinde teslimat süresi uzayabilir; Alıcı bu durumda
            bilgilendirilir.
          </p>
        </section>

        <section>
          <h2>5. Cayma Hakkı</h2>
          <p>
            Alıcı, teslim aldığı tarihten itibaren <strong>14 (on dört) gün</strong> içinde herhangi bir
            gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden cayma hakkına sahiptir.
          </p>
          <p>
            Ancak Mesafeli Sözleşmeler Yönetmeliği m.15/1-ğ uyarınca, <strong>Alıcı&apos;nın kişisel
            bilgileri (ad, unvan, iletişim bilgileri, QR kodu vb.) ile özel olarak üretilen NFC kartlar
            &ldquo;tüketicinin istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan mallar&rdquo;
            kapsamında değerlendirilebilir</strong> ve bu ürünlerde cayma hakkı kanunen sınırlı veya
            istisna olabilir. Kişiselleştirilmiş üretim başlamadan önce verilen iptal talepleri kabul
            edilir; üretime başlanmış kişiselleştirilmiş kartlarda cayma hakkının uygulanamayabileceği
            sipariş onayı sırasında ayrıca ve açıkça belirtilir.
          </p>
        </section>

        <section>
          <h2>6. Cayma Hakkının Kullanımı</h2>
          <p>
            Cayma hakkını kullanmak isteyen Alıcı, bu talebini süresi içinde
            {" "}<a href={`mailto:${legal.email}`} className="legal-link">{legal.email}</a>{" "}
            adresine yazılı olarak iletir. Ürün, tesliminden itibaren 10 gün içinde, faturasıyla birlikte
            ve olağan kullanım dışında bir yıpranma olmaksızın Satıcı&apos;ya gönderilir. Bedel, cayma
            bildiriminin ulaşmasını takip eden 14 gün içinde Alıcı&apos;ya iade edilir.
          </p>
        </section>

        <section>
          <h2>7. Uyuşmazlıkların Çözümü</h2>
          <p>
            İşbu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı&apos;nca yıllık olarak belirlenen
            parasal sınırlar dahilinde Alıcı&apos;nın yerleşim yerindeki Tüketici Hakem Heyetleri, bu
            sınırları aşan uyuşmazlıklarda ise Tüketici Mahkemeleri yetkilidir.
          </p>
        </section>

        <div className="legal-notice">
          Sipariş sırasında kabul edilen sözleşme sürümü, sipariş referansı ve onay kayıtları işlem kanıtı olarak saklanır.
        </div>
      </div>
</main>
  );
}
