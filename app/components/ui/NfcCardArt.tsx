import { Icon } from "../../icons";

/**
 * Yenomi ID NFC kartının tek, paylaşılan görsel gösterimi. Önceden bu kart
 * `/urunler`, `/urunler/nfc-kart` ve `/nfc-siparis` sayfalarında üç farklı
 * markup/CSS sınıfıyla (`.catalog-nfc-card`, `.nfc-card`, `.yenomi-card-art`)
 * ayrı ayrı çiziliyordu — aynı ürün her sayfada biraz farklı görünüyordu.
 *
 * Bu bileşen `/nfc-siparis` sayfasında zaten var olan, kullanıcının referans
 * gösterdiği kart tasarımını (`.yenomi-card-art`, `.qr-first-front`,
 * `.brand-back` ve `.physical-{renk}` sınıfları) tek kaynak olarak kullanır.
 * Sayfalar yalnızca
 * dıştaki konumlandırma/boyut sınıfını (`className`) kendi bağlamına göre
 * ekler; kartın kendisi her yerde aynı kalır.
 */

export type NfcCardColor = "BLACK" | "WHITE" | "PURPLE";

type FrontProps = {
  color?: NfcCardColor;
  /** Kullanıcıya özel kişisel QR görseli (data URL). Verilmezse jenerik QR ikonu gösterilir. */
  qrImage?: string;
  className?: string;
};

export function NfcCardFront({ color = "BLACK", qrImage, className = "" }: FrontProps) {
  return (
    <article className={`yenomi-card-art qr-first-front physical-${color.toLowerCase()} ${className}`.trim()}>
      <div className="card-art-lines card-art-lines-a" />
      <div className="card-art-lines card-art-lines-b" />
      <div className="qr-first-badge">KİŞİSEL QR</div>
      <div className="qr-first-code">
        {qrImage ? <img src={qrImage} alt="Kişisel QR kodu" /> : <div className="qr-fallback-icon"><Icon name="qr" /></div>}
      </div>
      <div className="qr-first-nfc" aria-label="NFC dokunma alanı">
        <i className="nfc-symbol"><Icon name="nfc" /></i>
        <span>Yaklaştır veya okut</span>
      </div>
    </article>
  );
}

type BackProps = {
  color?: NfcCardColor;
  className?: string;
};

export function NfcCardBack({ color = "BLACK", className = "" }: BackProps) {
  return (
    <article className={`yenomi-card-art brand-back physical-${color.toLowerCase()} ${className}`.trim()}>
      <div className="card-art-lines card-art-lines-a" />
      <div className="card-art-lines card-art-lines-b" />
      <div className="brand-back-content">
        <strong>YENOMI ID</strong>
        <span>Yaklaştır ve paylaş.</span>
      </div>
    </article>
  );
}
