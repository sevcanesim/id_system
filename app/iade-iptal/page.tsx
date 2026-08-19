import Link from "next/link";
import type { Metadata } from "next";
import { getLegalIdentity } from "../../lib/config/legal-identity";
import { PublicPageTitle } from "../components/PublicPageTitle";

export const metadata: Metadata = {
  title: "İade ve İptal Koşulları",
  description: "Yenomi ID NFC kart siparişleri için iade, iptal ve değişim koşulları.",
};

export default function IadeIptalPage() {
  const legal = getLegalIdentity();
  return (
    <main id="main-content" className="legal-page">
      <PublicPageTitle
        kicker="YENOMI ID · İADE & İPTAL"
        title="İade ve İptal Koşulları"
        description="NFC kart siparişlerinde iptal, iade, değişim ve kişiselleştirilmiş ürün süreçlerini açıkça inceleyin."
        backHref="/"
      />
      <div className="legal-shell">
        <p className="legal-updated">
          Yürürlük tarihi: {legal.effectiveDate}. Bu sayfa, NFC kart siparişleriniz için iptal, iade ve değişim süreçlerini özetler. Ayrıntılı
          hukuki koşullar için <Link href="/mesafeli-satis-sozlesmesi" className="legal-link">Mesafeli Satış Sözleşmesi</Link> geçerlidir.
        </p>

        <section>
          <h2>Sipariş İptali</h2>
          <p>
            Siparişiniz <strong>üretime alınmadan önce</strong> hesabınızdaki sipariş takip ekranından
            veya <a href={`mailto:${legal.email}`} className="legal-link">{legal.email}</a> üzerinden
            iptal talebinde bulunabilirsiniz; bu aşamada bedel tamamen iade edilir.
          </p>
        </section>

        <section>
          <h2>Kişiselleştirilmiş Ürünler</h2>
          <p>
            NFC kartlar kişisel QR bağlantısı, renk ve siparişe özel üretim bilgileriyle hazırlanır. Üretime
            alınmadan önce iptal mümkündür. Üretim başladıktan sonra keyfi cayma talepleri kişiselleştirilmiş
            ürün istisnası kapsamında değerlendirilebilir. Satıcı kaynaklı baskı, NFC, QR, renk veya üretim
            hatalarında ücretsiz yeniden üretim ya da uygulanabilir yasal seçimlik haklar saklıdır.
          </p>
        </section>

        <section>
          <h2>Hatalı veya Hasarlı Ürün</h2>
          <p>
            Kartınız hasarlı, kusurlu veya sipariş ettiğinizden farklı geldiyse, teslimattan itibaren 14
            gün içinde bize ulaşın. Tespit edilen üretim/kargo kaynaklı hatalarda kart ücretsiz olarak
            yeniden üretilir ve gönderilir; dilerseniz tam iade seçeneği de sunulur.
          </p>
        </section>

        <section>
          <h2>Dijital Kartvizit Profili</h2>
          <p>
            Dijital kartvizit kullanım hakkı ilk satın alma bedeliyle 1 yıl geçerlidir. Süre sonunda 7 günlük
            ek süre uygulanır; yenileme yapılmazsa profil askıya alınır ancak veriler silinmez. Tam iade
            onaylanırsa ilgili dijital kullanım hakkı iptal edilir ve profil yayından kaldırılır. Hatalı ürünün
            yalnızca yeniden üretilmesi halinde dijital erişim devam eder.
          </p>
        </section>

        <section>
          <h2>İade Süreci Nasıl İşler?</h2>
          <ol>
            <li><a href={`mailto:${legal.email}`} className="legal-link">{legal.email}</a> adresine sipariş numaranızla birlikte talebinizi iletin.</li>
            <li>Talebiniz en geç 2 iş günü içinde değerlendirilir ve size dönüş yapılır.</li>
            <li>Onaylanan iadelerde bedel, ödemenin yapıldığı yönteme 14 gün içinde iade edilir.</li>
          </ol>
        </section>

        <div className="legal-notice">
          <strong>Önemli not:</strong> Bu sayfa bilgilendirme amaçlıdır ve hukuki danışmanlık yerine
          geçmez; bağlayıcı koşullar Mesafeli Satış Sözleşmesi&apos;nde yer alır.
        </div>
      </div>
</main>
  );
}
