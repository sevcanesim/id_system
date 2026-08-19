type VisualVariant = "profile" | "dashboard" | "card";

export function YenomiProductVisual({ variant="profile", compact=false }: { variant?: VisualVariant; compact?: boolean }) {
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
    return (
      <div className={`yi-product-ui yi-product-ui--card${compact ? " yi-product-ui--compact" : ""}`} aria-hidden="true">
        <div className="yi-card-brand">YENOMI ID</div>
        <div className="yi-card-title">DIGITAL<br/>CARD</div>
        <div className="yi-card-nfc">))))</div>
        <div className="yi-card-bottom"><span>Yaklaştır.<br/>Profilini paylaş.</span><b>{[1,2,3,4,5,6,7,8,9].map(i=><i key={i}/>)}</b></div>
      </div>
    );
  }

  return (
    <div className={`yi-product-ui yi-product-ui--profile${compact ? " yi-product-ui--compact" : ""}`} aria-hidden="true">
      <div className="yi-profile-cover">
        <span>YENOMI ID</span><b>LIVE</b>
      </div>
      <div className="yi-profile-avatar">YI</div>
      <div className="yi-profile-body">
        <strong>Adın Soyadın</strong>
        <span>Ünvanın · Şirketin</span>
        <div className="yi-profile-actions"><i>☎</i><i>✉</i><i>in</i><i>↗</i></div>
        <div className="yi-profile-save">Rehbere Kaydet</div>
      </div>
    </div>
  );
}
