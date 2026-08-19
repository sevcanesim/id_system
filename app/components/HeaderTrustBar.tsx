import { Icon } from "../icons";

export default function HeaderTrustBar() {
  return (
    <div className="yi-header-trust" aria-label="Güven ve teslimat">
      <span><Icon name="lock" /> SSL ile şifrelenmiş bağlantı</span>
      <span><Icon name="shield" /> iyzico güvenceli ödeme</span>
      <span><Icon name="truck" /> Türkiye içi ücretsiz kargo</span>
    </div>
  );
}
