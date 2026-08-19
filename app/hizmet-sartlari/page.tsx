import Link from "next/link";
import type { Metadata } from "next";
import { getLegalIdentity } from "../../lib/config/legal-identity";
import { PublicPageTitle } from "../components/PublicPageTitle";

export const metadata: Metadata = {
  title: "Hizmet Şartları",
  description: "Yenomi ID dijital profil, NFC + QR kart ve hesap hizmetlerinin kullanım şartları.",
};

export default function HizmetSartlariPage() {
  const legal = getLegalIdentity();
  return (
    <main id="main-content" className="legal-page legal-page--premium">
      <PublicPageTitle
        kicker="YENOMI ID · HİZMET ŞARTLARI"
        title="Hizmet Şartları"
        description="Yenomi ID hesabını, dijital profilini ve NFC + QR kart hizmetlerini kullanırken geçerli olan temel kurallar."
        backHref="/"
      />
      <div className="legal-shell">
        <p className="legal-updated">Yürürlük tarihi: {legal.effectiveDate}</p>

        <ul className="legal-toc" aria-label="İçindekiler">
          <li><a href="#kapsam">01 · Kapsam</a></li><li><a href="#hesap">02 · Hesap</a></li>
          <li><a href="#kart">03 · Kart ve profil</a></li><li><a href="#kullanim">04 · Kabul edilebilir kullanım</a></li>
          <li><a href="#odeme">05 · Sipariş ve ödeme</a></li><li><a href="#fikri">06 · İçerik ve fikri haklar</a></li>
          <li><a href="#sorumluluk">07 · Sorumluluk</a></li><li><a href="#iletisim">08 · İletişim</a></li>
        </ul>

        <section id="kapsam"><h2>1. Kapsam</h2><p>Bu şartlar Yenomi ID web sitesi, hesap, dijital profil, NFC + QR kart, aktivasyon ve ilgili destek hizmetlerinin kullanımına uygulanır. Hizmeti kullanarak bu şartları kabul etmiş olursunuz.</p></section>
        <section id="hesap"><h2>2. Hesap ve güvenlik</h2><p>Hesap bilgilerinizin doğru ve güncel tutulmasından siz sorumlusunuz. Hesabınız üzerinden gerçekleştirilen işlemlerin güvenliği için giriş bilgilerinizi üçüncü kişilerle paylaşmamalısınız. Şüpheli bir erişimi fark ettiğinizde destek kanalına gecikmeden bildirim yapmalısınız.</p></section>
        <section id="kart"><h2>3. NFC + QR kart ve dijital profil</h2><p>NFC + QR kart, dijital profilinize erişim sağlayan fiziksel bir temas noktasıdır. Profildeki bilgiler hesabınız üzerinden güncellenebilir. Kartın fiziksel yüzeyi değişmeden dijital bağlantının güncel kalması hizmetin temel özelliğidir.</p><p>Profilinizde yayımladığınız bilgilerin doğruluğundan ve paylaşmaya yetkili olduğunuz içeriklerden siz sorumlusunuz.</p></section>
        <section id="kullanim"><h2>4. Kabul edilebilir kullanım</h2><p>Hizmet; hukuka aykırı, yanıltıcı, tehdit edici, başkalarının haklarını ihlal eden veya sistem güvenliğini tehlikeye atan amaçlarla kullanılamaz. Kötüye kullanım, sahtecilik, yetkisiz erişim ve hizmeti bozma girişimleri sınırlandırılabilir veya engellenebilir.</p></section>
        <section id="odeme"><h2>5. Sipariş, ücret ve ödeme</h2><p>Ürün ve hizmet ücretleri sipariş sırasında gösterilir. Ödeme işlemleri, ödeme ekranında belirtilen güvenli ödeme altyapısı üzerinden gerçekleştirilir. Kişiselleştirilmiş ürünler için üretim ve teslimat koşulları ilgili satış belgelerinde ayrıca açıklanabilir.</p></section>
        <section id="fikri"><h2>6. İçerik ve fikri haklar</h2><p>Yenomi ID markası, arayüzleri, yazılımı ve hizmete ait özgün materyaller üzerindeki haklar ilgili hak sahiplerine aittir. Kullanıcı tarafından yüklenen içerik üzerindeki haklar kullanıcıda kalır; ancak hizmetin sunulması için gerekli teknik kullanım izni verilir.</p></section>
        <section id="sorumluluk"><h2>7. Hizmet sürekliliği ve sorumluluk</h2><p>Hizmetin güvenli ve erişilebilir tutulması için makul teknik önlemler alınır. Bakım, altyapı arızası veya kontrol dışındaki olaylar nedeniyle geçici kesintiler yaşanabilir. Kanunen sınırlandırılamayan tüketici hakları saklıdır.</p></section>
        <section id="iletisim"><h2>8. İletişim</h2><p>Hizmetle ilgili sorularınız için <a className="legal-link" href={`mailto:${legal.email}`}>{legal.email}</a> adresinden bize ulaşabilirsiniz. Diğer yasal belgeler için <Link className="legal-link" href="/kvkk">KVKK</Link> ve <Link className="legal-link" href="/gizlilik">Gizlilik Politikası</Link> sayfalarını inceleyebilirsiniz.</p></section>

        <div className="legal-notice">Bu şartlar, hizmet kapsamı veya yürürlükteki mevzuat değiştikçe güncellenebilir. Güncel sürüm bu sayfada yayımlanır.</div>
      </div>
    </main>
  );
}
