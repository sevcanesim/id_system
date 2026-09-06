import Link from "next/link";
import { Brand } from "./Brand";

type FooterVariant = "default" | "compact" | "how-it-works";

function FooterContent() {
  return (
    <>
      <div className="yi-footer__premium-grid">
        <div className="yi-footer__premium-brand">
          <Brand compact />
          <p>Kimliğiniz her tanışmada hazır, her zaman sizin kontrolünüzde.</p>
        </div>

        <nav className="yi-footer__premium-column" aria-label="Ürün">
          <strong>Ürün</strong>
          <Link href="/urunler">Kartını seç</Link>
          <Link href="/nasil-calisir">Nasıl çalışır?</Link>
          <Link href="/kurumsal">Ekip çözümleri</Link>
        </nav>

        <nav className="yi-footer__premium-column" aria-label="Destek">
          <strong>Destek</strong>
          <Link href="/destek">Yardım merkezi</Link>
          <Link href="/iade-iptal">Sipariş desteği</Link>
          <Link href="/giris">Hesabına git</Link>
        </nav>

        <nav className="yi-footer__premium-column" aria-label="Yasal">
          <strong>Güven &amp; yasal</strong>
          <Link href="/mesafeli-satis-sozlesmesi">Satış koşulları</Link>
          <Link href="/hizmet-sartlari">Hizmet Şartları</Link>
          <Link href="/kvkk">KVKK</Link>
          <Link href="/gizlilik">Gizlilik ilkeleri</Link>
        </nav>
      </div>

      <div className="yi-footer__premium-base">
        <span>© 2026 Yenomi ID</span>
        <span>Yenomi ID — by Yenomilabs</span>
      </div>
    </>
  );
}

export default function SiteFooter({ variant = "default" }: { variant?: FooterVariant }) {
  return (
    <footer className={`yi-footer yi-footer--new yi-footer--premium ${variant === "compact" ? "yi-footer--compact" : ""} ${variant === "how-it-works" ? "yi-footer--how-it-works" : ""}`}>
      <div className="yi-container">
        <FooterContent />
      </div>
    </footer>
  );
}
