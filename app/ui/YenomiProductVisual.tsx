import { Icon } from "../icons";

type VisualVariant = "profile" | "dashboard" | "card";
type CardFace = "front" | "back";

const QR_SIZE = 13;

function specimenQrCells() {
  return Array.from({ length: QR_SIZE * QR_SIZE }, (_, index) => {
    const x = index % QR_SIZE;
    const y = Math.floor(index / QR_SIZE);
    const finder = (cx: number, cy: number) => x >= cx && x < cx + 3 && y >= cy && y < cy + 3;
    const inFinder = finder(0, 0) || finder(QR_SIZE - 3, 0) || finder(0, QR_SIZE - 3);
    const on = inFinder || ((x * 5 + y * 11) % 4 !== 1);
    return <i key={index} className={on ? "is-on" : undefined} />;
  });
}

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
          <div><small>Görüntülenme</small><b>12.8K</b></div>
          <div><small>Bağlantı</small><b>4.2K</b></div>
          <div><small>Profil</small><b>1.6K</b></div>
        </div>
        <div className="yi-ui-dashboard-grid">
          <div className="yi-ui-chart">{[35,58,43,76,52].map((h,i)=><i style={{height:`${h}%`}} key={i}/>)}</div>
          <div className="yi-ui-list">{[1,2,3,4].map(i=><i key={i}/>)}</div>
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
            <div className="yi-card-qr">{specimenQrCells()}</div>
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
        <span>CANLI PROFİL</span><b>LIVE</b>
      </div>
      <div className="yi-profile-avatar" />
      <div className="yi-profile-body">
        <strong>Adın Soyadın</strong>
        <span>Ünvanın · Şirketin</span>
        <div className="yi-profile-actions"><i>☎</i><i>✉</i><i>in</i><i>↗</i></div>
        <div className="yi-profile-save">Rehbere Kaydet</div>
      </div>
    </div>
  );
}
