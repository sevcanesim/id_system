/**
 * Shared top brand ticker for public browsing chrome.
 * Quiet checkout routes hide this strip on purpose.
 */
const COPIES = 8;

export default function AnnouncementBar() {
  return (
    <div className="yi-brand-marquee" role="note" aria-label="Yenomi ID · yenomilabs.com">
      <div className="yi-brand-marquee__track">
        {Array.from({ length: COPIES }, (_, index) => (
          <span className="yi-brand-marquee__unit" key={index}>
            <strong>YENOMI ID</strong>
            <span className="yi-brand-marquee__stars" aria-hidden="true"><i /><i /><i /></span>
            <strong>www.yenomilabs.com</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
