import Link from "next/link";
import { Brand } from "./Brand";

type FooterVariant = "default" | "compact" | "how-it-works";

function FooterContent() {
  return (
    <>
      <div className="yi-footer__identity">
        <div className="yi-footer__brand">
          <Brand compact />
          <p>Dijital kartvizit: bireysel kullanım ve kurumsal ekip yönetimi.</p>
        </div>

        <div className="yi-footer__layers" aria-label="Ürün katmanları">
          <div className="yi-footer__layer">
            <span>Endüstri katmanımız</span>
            <a className="yi-footer__serp-title" href="https://opsola.com" target="_blank" rel="noreferrer">Opsola</a>
            <a className="yi-footer__serp-url" href="https://opsola.com" target="_blank" rel="noreferrer">https://opsola.com</a>
            <p>Karmaşık sistemlere mühendislik çözümleri. Mühendislik, imalat, otomasyon ve devreye alma — kapsamı belirsiz projeleri netleştirir, çalışan sistem teslim ederiz.</p>
          </div>
          <div className="yi-footer__layer">
            <span>Yazılım katmanımız</span>
            <a className="yi-footer__serp-title" href="https://yenomilabs.com" target="_blank" rel="noreferrer">Yenomilabs</a>
            <a className="yi-footer__serp-url" href="https://yenomilabs.com" target="_blank" rel="noreferrer">https://yenomilabs.com</a>
            <p>Markalar ve endüstriyel operasyonlar için özel yazılım sistemleri, Digital Twin altyapıları, QR tabanlı platformlar, portal çözümleri ve AI destekli dijital deneyimler geliştirir.</p>
          </div>
        </div>
      </div>

      <div className="yi-footer__base">
        <span>© 2026 Yenomilabs</span>
        <a href="https://yenomilabs.com" target="_blank" rel="noreferrer">yenomilabs.com ↗</a>
        <nav aria-label="Yasal bağlantılar">
          <Link href="/destek">Destek</Link>
          <Link href="/iade-iptal">İade &amp; İptal</Link>
          <Link href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</Link>
          <Link href="/hizmet-sartlari">Hizmet Şartları</Link>
          <Link href="/kvkk">KVKK</Link>
          <Link href="/gizlilik">Gizlilik</Link>
        </nav>
      </div>
    </>
  );
}

export default function SiteFooter({ variant = "default" }: { variant?: FooterVariant }) {
  return (
    <footer className={`yi-footer yi-footer--new ${variant === "compact" ? "yi-footer--compact" : ""} ${variant === "how-it-works" ? "yi-footer--how-it-works" : ""}`}>
      <div className="yi-container">
        <FooterContent />
      </div>
    </footer>
  );
}
