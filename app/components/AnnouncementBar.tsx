/**
 * Shared top brand ticker for public browsing chrome.
 * Quiet checkout routes hide this strip on purpose.
 */
import { Icon } from "../icons";

const COPIES = 8;

export default function AnnouncementBar() {
  return (
    <div className="yi-brand-marquee" role="note" aria-label="Yenomi ID · yenomilabs.com">
      <div className="yi-brand-marquee__track">
        {Array.from({ length: COPIES }, (_, index) => (
          <span className="yi-brand-marquee__unit" key={index}>
            <span className="yi-brand-marquee__item">
              <Icon name="id" />
              <strong>YENOMI ID</strong>
            </span>
            <span className="yi-brand-marquee__stars" aria-hidden="true"><i /><i /><i /></span>
            <span className="yi-brand-marquee__item">
              <Icon name="link" />
              <strong>www.yenomilabs.com</strong>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
