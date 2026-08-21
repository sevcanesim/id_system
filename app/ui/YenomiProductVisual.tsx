import { Icon } from "../icons";

type VisualVariant = "profile" | "dashboard" | "card";
type CardFace = "front" | "back";

export function YenomiProductVisual({
  variant = "profile",
  compact = false,
  face = "front",
}: {
  variant?: VisualVariant;
  compact?: boolean;
  face?: CardFace;
}) {
  if (variant === "dashboard") {
    return (
      <div className={`yi-product-ui yi-product-ui--dashboard${compact ? " yi-product-ui--compact" : ""}`} aria-hidden="true">
        <div className="yi-ui-top"><strong>Yenomi ID</strong><span>Business</span><i/><i/><i/></div>
        <div className="yi-ui-metrics">
          <div><small>Görüntülenme</small><b>—</b></div>
          <div><small>Bağlantı</small><b>—</b></div>
          <div><small>Profil</small><b>—</b></div>
        </div>
        <div className="yi-ui-dashboard-grid">
          <div className="yi-ui-chart"><i/><i/><i/><i/><i/></div>
          <div className="yi-ui-list"><i/><i/><i/><i/></div>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    const foilClass = `yi-product-ui yi-product-ui--card yi-product-ui--card-foil yi-product-ui--card-${face}${compact ? " yi-product-ui--compact" : ""}`;
    if (face === "back") {
      return (
        <div className={foilClass} aria-hidden="true">
          <div className="yi-card-face yi-card-face--back">
            <p className="yi-card-motto">Yaklaştır. Profil açılsın.</p>
            <div className="yi-card-qr">
              <Icon name="qr" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className={foilClass} aria-hidden="true">
        <div className="yi-card-face">
          <div className="yi-card-identity">
            <strong>Adın Soyadın</strong>
            <span className="yi-card-role">Ünvanın</span>
            <b>Şirketin</b>
          </div>
          <div className="yi-card-nfc-mark">
            <Icon name="nfc" />
            <small>NFC</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`yi-product-ui yi-product-ui--profile${compact ? " yi-product-ui--compact" : ""}`} aria-hidden="true">
      <div className="yi-profile-cover">
        <span>CANLI PROFİL</span>
        <b>NFC + QR</b>
        <div className="yi-profile-portrait">
          <em>AS</em>
        </div>
      </div>
      <div className="yi-profile-body">
        <strong>Adın Soyadın</strong>
        <span>Ünvanın · Şirketin</span>
        <p className="yi-profile-bio">Kart bir kez basılır. Unvanın değişince profil güncellenir; baskı tekrarlanmaz.</p>
        <div className="yi-profile-cta-row">
          <div className="yi-profile-save">Rehbere Kaydet</div>
          <div className="yi-profile-ghost">Kartı incele</div>
        </div>
        <div className="yi-profile-chips">
          <div>
            <small>NFC</small>
            <b>Dokun, aç</b>
          </div>
          <div>
            <small>QR</small>
            <b>Anında paylaş</b>
          </div>
          <div>
            <small>KAYIP</small>
            <b>Kartı kapat</b>
          </div>
        </div>
        <div className="yi-profile-actions">
          <span className="yi-profile-action"><Icon name="whatsapp" /></span>
          <span className="yi-profile-action"><Icon name="mail" /></span>
          <span className="yi-profile-action"><Icon name="social" /></span>
          <span className="yi-profile-action"><Icon name="phone" /></span>
          <span className="yi-profile-action"><Icon name="save" /></span>
        </div>
        <div className="yi-profile-links">
          <div className="yi-profile-link">
            <span className="yi-profile-link-icon"><Icon name="whatsapp" /></span>
            <span className="yi-profile-link-copy">
              <b>WhatsApp</b>
              <small>Hızlı mesaj</small>
            </span>
            <Icon name="chevronRight" />
          </div>
          <div className="yi-profile-link">
            <span className="yi-profile-link-icon"><Icon name="phone" /></span>
            <span className="yi-profile-link-copy">
              <b>Telefon ile ara</b>
              <small>Tek dokunuş</small>
            </span>
            <Icon name="chevronRight" />
          </div>
          <div className="yi-profile-link">
            <span className="yi-profile-link-icon"><Icon name="save" /></span>
            <span className="yi-profile-link-copy">
              <b>Rehbere kaydet</b>
              <small>.vcf dosyası</small>
            </span>
            <Icon name="chevronRight" />
          </div>
        </div>
      </div>
    </div>
  );
}
