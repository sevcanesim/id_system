import Link from "next/link";
import { Brand } from "./Brand";

type FooterVariant = "default" | "compact" | "how-it-works";

function FooterContent() {
  return (
    <>
      <div className="yi-footer__premium-grid">
        <div className="yi-footer__premium-brand">
          <Brand compact />
          <p>Bir kez tanıt. Bilgilerin değişse de bağlantın güncel kalsın.</p>
        </div>

        <nav className="yi-footer__premium-column" aria-label="Ürün">
          <strong>Ürün</strong>
          <Link href="/urunler">Ürünler</Link>
          <Link href="/nasil-calisir">Nasıl Çalışır</Link>
          <Link href="/kurumsal">Kurumsal</Link>
        </nav>

        <nav className="yi-footer__premium-column" aria-label="Destek">
          <strong>Destek</strong>
          <Link href="/destek">Yardım Merkezi</Link>
          <Link href="/iade-iptal">İade &amp; İptal</Link>
          <Link href="/giris">Hesabım</Link>
        </nav>

        <nav className="yi-footer__premium-column" aria-label="Yasal">
          <strong>Yasal</strong>
          <Link href="/mesafeli-satis-sozlesmesi">Mesafeli Satış</Link>
          <Link href="/hizmet-sartlari">Hizmet Şartları</Link>
          <Link href="/kvkk">KVKK</Link>
          <Link href="/gizlilik">Gizlilik</Link>
        </nav>
      </div>

      <div className="yi-footer__premium-base">
        <span>© 2026 Yenomilabs</span>
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
