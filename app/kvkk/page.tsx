import Link from "next/link";
import type { Metadata } from "next";
import { getLegalIdentity } from "../../lib/config/legal-identity";
import { PublicPageTitle } from "../components/PublicPageTitle";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Yenomi ID için 6698 sayılı KVKK kapsamında kişisel verilerin işlenmesine ilişkin aydınlatma metni.",
};

export default function KvkkPage() {
  const legal = getLegalIdentity();
  return (
    <main id="main-content" className="legal-page legal-page--premium">
      <PublicPageTitle
        kicker="YENOMI ID · HUKUKİ BİLGİ"
        title="KVKK Aydınlatma Metni"
        description="Kişisel verilerinizin hangi amaçlarla, hangi hukuki sebeplerle ve ne şekilde işlendiğini açık ve anlaşılır biçimde açıklıyoruz."
        backHref="/"
      />
      <div className="legal-shell">
        <p className="legal-updated">Yürürlük tarihi: {legal.effectiveDate}. Ayrıntılı gizlilik politikası için <Link href="/gizlilik" className="legal-link">Gizlilik</Link> sayfasını inceleyebilirsiniz.</p>
        <ul className="legal-toc" aria-label="İçindekiler">
          <li><a href="#veri-sorumlusu">01 · Veri sorumlusu</a></li><li><a href="#veriler">02 · İşlenen veriler</a></li>
          <li><a href="#amac">03 · İşleme amaçları</a></li><li><a href="#hukuki-sebep">04 · Hukuki sebepler</a></li>
          <li><a href="#aktarim">05 · Aktarım</a></li><li><a href="#saklama">06 · Saklama</a></li>
          <li><a href="#haklar">07 · Haklarınız</a></li><li><a href="#iletisim">08 · Başvuru</a></li>
        </ul>
        <section id="veri-sorumlusu"><h2>1. Veri Sorumlusu</h2><p>6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu, <strong>{legal.brandLine}</strong> hizmetini sunan <strong>{legal.tradeName}</strong>&apos;dir.</p><table><tbody><tr><th>Hizmet sağlayıcı</th><td>{legal.tradeName}</td></tr><tr><th>İşletme tipi</th><td>{legal.entityType}</td></tr><tr><th>Marka</th><td>{legal.brandLine}</td></tr>{legal.taxOffice ? <tr><th>Vergi dairesi</th><td>{legal.taxOffice}</td></tr> : null}{legal.taxNumber ? <tr><th>Vergi no</th><td>{legal.taxNumber}</td></tr> : null}{legal.mersisNumber ? <tr><th>MERSİS</th><td>{legal.mersisNumber}</td></tr> : null}{legal.tradeRegistryNumber ? <tr><th>Ticaret sicil no</th><td>{legal.tradeRegistryNumber}</td></tr> : null}<tr><th>Adres</th><td>{legal.address}</td></tr><tr><th>E-posta</th><td>{legal.kvkkEmail}</td></tr></tbody></table></section>
        <section id="veriler"><h2>2. İşlenen kişisel veriler</h2><p>Hizmetin niteliğine ve sizinle kurulan ilişkiye bağlı olarak aşağıdaki veri kategorileri işlenebilir:</p><ul><li>Kimlik ve iletişim bilgileri</li><li>Hesap, oturum ve doğrulama bilgileri</li><li>Dijital kartvizit ve profil içeriği</li><li>Sipariş, teslimat ve işlem kayıtları</li><li>Ödeme işlemine ilişkin teknik kayıtlar</li><li>Hizmet güvenliği ve kullanımına ilişkin teknik kayıtlar</li></ul></section>
        <section id="amac"><h2>3. İşleme amaçları</h2><p>Veriler; hesabın oluşturulması ve yönetilmesi, siparişlerin alınması ve teslim edilmesi, dijital profil hizmetinin sunulması, müşteri desteği, güvenlik ve kötüye kullanımın önlenmesi, yasal yükümlülüklerin yerine getirilmesi ve hizmet kalitesinin geliştirilmesi amaçlarıyla işlenebilir.</p></section>
        <section id="hukuki-sebep"><h2>4. Hukuki sebepler</h2><p>İşleme faaliyetinin niteliğine göre KVKK kapsamında sözleşmenin kurulması veya ifası, hukuki yükümlülüğün yerine getirilmesi, bir hakkın tesisi/kullanılması/korunması, meşru menfaat ve gerekli hâllerde açık rıza gibi hukuki sebeplere dayanılabilir.</p></section>
        <section id="aktarim"><h2>5. Aktarım ve hizmet sağlayıcılar</h2><p>Hizmetin çalışması için gerekli olduğu ölçüde ödeme, barındırma, e-posta, kargo, kimlik doğrulama ve teknik altyapı hizmet sağlayıcılarıyla veri paylaşımı yapılabilir. Paylaşımlar amaçla sınırlı tutulur ve ilgili güvenlik yükümlülükleri gözetilir.</p></section>
        <section id="saklama"><h2>6. Saklama süresi</h2><p>Kişisel veriler, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen saklama süreleri kadar tutulur. Süre sona erdiğinde veriler silinir, yok edilir veya mevzuatın izin verdiği şekilde anonimleştirilir.</p></section>
        <section id="haklar"><h2>7. KVKK kapsamındaki haklarınız</h2><p>KVKK'nın 11. maddesi kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini veya kanuni şartlar oluştuğunda silinmesini/yok edilmesini isteme ve mevzuatta tanınan diğer haklarınızı kullanabilirsiniz.</p></section>
        <section id="iletisim"><h2>8. Başvuru</h2><p>KVKK kapsamındaki taleplerinizi <a className="legal-link" href={`mailto:${legal.kvkkEmail}`}>{legal.kvkkEmail}</a> üzerinden iletebilirsiniz. Başvurular yürürlükteki mevzuat ve şirket başvuru prosedürleri çerçevesinde değerlendirilir.</p></section>
        <div className="legal-notice">Bu metin, yürürlükteki hukuki ve teknik yapılandırmaya göre güncellenebilir. Güncel sürüm bu sayfada yayımlanır.</div>
      </div>
    </main>
  );
}
