import Link from "next/link";
import type { Metadata } from "next";
import { getLegalIdentity } from "../../lib/config/legal-identity";
import { PublicPageTitle } from "../components/PublicPageTitle";

export const metadata: Metadata = {
  title: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
  description: "Yenomi ID gizlilik politikası ve 6698 sayılı KVKK kapsamında aydınlatma metni.",
};

export default function GizlilikPage() {
  const legal = getLegalIdentity();
  return (
    <main id="main-content" className="legal-page">
      <PublicPageTitle
        kicker="YENOMI ID · HUKUKİ BİLGİ"
        title="Gizlilik Politikası ve KVKK Aydınlatma Metni"
        description="Kişisel verilerinizin korunması, işlenmesi ve haklarınız hakkında açık ve anlaşılır bilgiler."
        backHref="/"
      />
      <div className="legal-shell">
        <p className="legal-updated">Yürürlük tarihi: {legal.effectiveDate}</p>

        <ul className="legal-toc">
          <li><a href="#veri-sorumlusu">Veri Sorumlusu</a></li>
          <li><a href="#toplanan-veriler">Toplanan Veriler</a></li>
          <li><a href="#isleme-amaclari">İşleme Amaçları</a></li>
          <li><a href="#hukuki-sebep">Hukuki Sebep</a></li>
          <li><a href="#aktarim">Aktarım ve Üçüncü Taraflar</a></li>
          <li><a href="#saklama">Saklama Süresi</a></li>
          <li><a href="#cerezler">Çerezler</a></li>
          <li><a href="#haklar">Haklarınız</a></li>
          <li><a href="#iletisim">İletişim</a></li>
        </ul>

        <section id="veri-sorumlusu">
          <h2>1. Veri Sorumlusu</h2>
          <p>
            6698 sayılı Kişisel Verilerin Korunması Kanunu (&ldquo;KVKK&rdquo;) uyarınca, Yenomi ID markasını
            işleten <strong>{legal.tradeName}</strong> (&ldquo;Yenomilabs&rdquo;, &ldquo;biz&rdquo;)
            veri sorumlusu sıfatıyla hareket etmektedir.
          </p>
          <table>
            <tbody>
              <tr><th>Unvan</th><td>{legal.tradeName}</td></tr>
              <tr><th>MERSİS No</th><td>{legal.mersisNumber}</td></tr>
              <tr><th>Vergi Dairesi</th><td>{legal.taxOffice}</td></tr>
              <tr><th>Vergi No</th><td>{legal.taxNumber}</td></tr>
              <tr><th>Adres</th><td>{legal.address}</td></tr>
              <tr><th>Yetkili</th><td>{legal.authorizedPerson}</td></tr>
              <tr><th>Telefon</th><td>{legal.phone}</td></tr>
              <tr><th>E-posta</th><td>{legal.email}</td></tr>
              <tr><th>Web</th><td>{legal.website}</td></tr>
            </tbody>
          </table>
        </section>

        <section id="toplanan-veriler">
          <h2>2. Toplanan Kişisel Veriler</h2>
          <p>Yenomi ID&apos;yi kullanırken aşağıdaki kategorilerde veri işlenebilir:</p>
          <ul>
            <li><strong>Kimlik ve iletişim verileri:</strong> ad soyad, unvan, şirket, telefon, e-posta, web sitesi, sosyal medya bağlantıları.</li>
            <li><strong>Hesap verileri:</strong> e-posta/şifre veya LinkedIn ile giriş bilgileri, oturum kayıtları.</li>
            <li><strong>Kartvizit içeriği:</strong> profil fotoğrafı, kart üzerinde göstermeyi tercih ettiğiniz her türlü bilgi.</li>
            <li><strong>Sipariş ve teslimat verileri:</strong> teslimat adresi, konum bilgisi (adres doğrulama için), sipariş içeriği.</li>
            <li><strong>Ödeme verileri:</strong> ödeme, iyzico altyapısı üzerinden doğrudan işlenir; kart numarası gibi hassas ödeme verileri bizim sunucularımızda veya veritabanımızda saklanmaz.</li>
            <li><strong>Teknik veriler:</strong> IP adresi, tarayıcı bilgisi, çerez kimlikleri, ziyaret/etkileşim kayıtları.</li>
          </ul>
        </section>

        <section id="isleme-amaclari">
          <h2>3. İşleme Amaçları</h2>
          <ul>
            <li>Hesabınızı oluşturmak, doğrulamak ve güvenliğini sağlamak,</li>
            <li>Dijital kartvizit profilinizi yayınlamak ve QR/NFC ile erişilebilir kılmak,</li>
            <li>NFC kart siparişlerini almak, üretmek ve kargolamak,</li>
            <li>Ödeme işlemlerini iyzico altyapısı üzerinden güvenli şekilde gerçekleştirmek,</li>
            <li>Yasal yükümlülükleri (fatura, mesafeli satış, tüketici hakları) yerine getirmek,</li>
            <li>Hizmet kalitesini ölçmek, hataları tespit etmek ve güvenliği sağlamak (hız sınırlama, kötüye kullanım tespiti dahil).</li>
          </ul>
        </section>

        <section id="hukuki-sebep">
          <h2>4. Hukuki Sebep</h2>
          <p>
            Veriler, KVKK m.5/2 kapsamında bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması,
            hukuki yükümlülüğün yerine getirilmesi, veri sorumlusunun meşru menfaati ve — kart üzerinde
            yayınlamayı siz seçtiğiniz bilgiler için — açık rızanız hukuki sebeplerine dayanılarak işlenir.
          </p>
        </section>

        <section id="aktarim">
          <h2>5. Aktarım ve Üçüncü Taraflar</h2>
          <p>Hizmeti sunabilmek için verileriniz sınırlı ölçüde şu hizmet sağlayıcılarla paylaşılır:</p>
          <ul>
            <li><strong>Supabase</strong> — hesap, profil ve sipariş verilerinin barındırıldığı veritabanı ve kimlik doğrulama altyapısı.</li>
            <li><strong>iyzico</strong> — ödeme işlemlerinin güvenli şekilde alınması.</li>
            <li><strong>Kargo firması</strong> — NFC kart siparişlerinin teslimatı için ad, adres ve telefon bilgisi.</li>
            <li><strong>LinkedIn</strong> — LinkedIn ile giriş yapmayı tercih ederseniz, kimlik doğrulama amacıyla.</li>
          </ul>
          <p>Bu sağlayıcılar yalnızca hizmetin gerektirdiği ölçüde veriye erişebilir ve kendi gizlilik politikalarına tabidir.</p>
        </section>

        <section id="saklama">
          <h2>6. Saklama Süresi</h2>
          <p>
            Kişisel veriler, işleme amacının gerektirdiği süre ile Türk Ticaret Kanunu ve vergi mevzuatı
            gibi yasal saklama yükümlülükleri boyunca (fatura ve sipariş kayıtları için asgari 10 yıl)
            saklanır. Hesabınızı silmeniz halinde, yasal saklama zorunluluğu bulunmayan veriler makul bir
            süre içinde silinir veya anonimleştirilir.
          </p>
        </section>

        <section id="cerezler">
          <h2>7. Çerezler</h2>
          <p>
            Site, oturumunuzu sürdürmek ve temel işlevselliği sağlamak için zorunlu çerezler kullanır.
            Şu an üçüncü taraf reklam/izleme çerezi kullanılmamaktadır; bu değişirse bu bölüm ve gerekli
            çerez onay mekanizması güncellenecektir.
          </p>
        </section>

        <section id="haklar">
          <h2>8. KVKK Kapsamındaki Haklarınız</h2>
          <p>KVKK m.11 uyarınca şu haklara sahipsiniz:</p>
          <ul>
            <li>Kişisel verinizin işlenip işlenmediğini öğrenme,</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme,</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
            <li>Yurt içinde/dışında aktarıldığı üçüncü kişileri bilme,</li>
            <li>Eksik/yanlış işlenmişse düzeltilmesini isteme,</li>
            <li>Silinmesini veya yok edilmesini isteme,</li>
            <li>Otomatik sistemlerle analiz sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
            <li>Kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme.</li>
          </ul>
          <p>Bu haklarınızı kullanmak için aşağıdaki iletişim kanalından bize ulaşabilirsiniz.</p>
        </section>

        <section id="iletisim">
          <h2>9. İletişim</h2>
          <p>
            Talepleriniz için <a href={`mailto:${legal.kvkkEmail}`} className="legal-link">{legal.kvkkEmail}</a> adresinden
            bize ulaşabilirsiniz. Kimliğinizi doğrulayabilmemiz için talebinizi kayıtlı e-posta adresinizden
            iletmeniz önerilir.
          </p>
        </section>

        <div className="legal-notice">
          Bu metnin yürürlük sürümü ve satıcı kimlik bilgileri dağıtım ortamındaki doğrulanmış hukuki yapılandırmadan alınır.
        </div>
      </div>
</main>
  );
}
