/**
 * Quiet, static purchase-confidence strip for public browsing chrome.
 * Checkout and other quiet routes hide this strip via PublicSiteShell.
 */
const ITEMS = [
  "Türkiye içi kargo dahil",
  "2 iş gününde hazırlanır",
  "Güvenli iyzico ödeme",
] as const;

export default function AnnouncementBar() {
  return (
    <div className="yi-brand-marquee yi-brand-marquee--static" role="note" aria-label="Kargo, hazırlık süresi ve güvenli ödeme bilgileri">
      <div className="yi-brand-marquee__static-inner">
        {ITEMS.map((item, index) => (
          <span className="yi-brand-marquee__static-item" key={item}>
            {index > 0 ? <i aria-hidden="true" /> : null}
            <strong>{item}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
