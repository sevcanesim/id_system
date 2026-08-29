import { Icon, type IconName } from "../icons";

const ITEMS: ReadonlyArray<{ label: string; icon: IconName }> = [
  { label: "Türkiye içi kargo dahil", icon: "box" },
  { label: "2 iş gününde hazırlanır", icon: "clock" },
  { label: "Güvenli iyzico ödeme", icon: "lock" },
];

export default function AnnouncementBar() {
  return (
    <div className="yi-brand-marquee yi-brand-marquee--static" role="note" aria-label="Kargo, hazırlık süresi ve güvenli ödeme bilgileri">
      <div className="yi-brand-marquee__static-inner">
        {ITEMS.map((item) => (
          <span className="yi-brand-marquee__static-item" key={item.label}>
            <Icon name={item.icon} />
            <strong>{item.label}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
