/**
 * Shared top brand ticker for public browsing chrome.
 * Quiet checkout routes hide this strip on purpose.
 */
const MARQUEE_UNIT = [
  "YENOMI ID",
  "www.yenomilabs.com",
  "SSL ile şifrelenmiş bağlantı",
  "iyzico güvenceli ödeme",
  "Türkiye içi ücretsiz kargo",
].join("  |  ");

export default function AnnouncementBar() {
  const copies = Array.from({ length: 8 }, () => MARQUEE_UNIT);
  return (
    <div className="yi-brand-marquee" role="note" aria-label="Yenomi ID, yenomilabs.com, SSL, iyzico ve ücretsiz kargo">
      <div className="yi-brand-marquee__track">
        {copies.map((text, index) => (
          <span key={`${text}-${index}`}>{text}</span>
        ))}
      </div>
    </div>
  );
}
