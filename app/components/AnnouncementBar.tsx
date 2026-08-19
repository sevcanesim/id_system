/**
 * Shared top brand ticker for public browsing chrome.
 * Quiet checkout routes hide this strip on purpose.
 */
import { Fragment } from "react";
import { Icon, type IconName } from "../icons";

const COPIES = 8;

const ITEMS: Array<{ icon: IconName; label: string }> = [
  { icon: "id", label: "YENOMI ID" },
  { icon: "link", label: "www.yenomilabs.com" },
  { icon: "lock", label: "SSL ile şifrelenmiş bağlantı" },
  { icon: "shield", label: "iyzico güvenceli ödeme" },
  { icon: "truck", label: "Türkiye içi ücretsiz kargo" },
];

export default function AnnouncementBar() {
  return (
    <div className="yi-brand-marquee" role="note" aria-label="Yenomi ID, yenomilabs.com, SSL, iyzico ve Türkiye içi ücretsiz kargo">
      <div className="yi-brand-marquee__track">
        {Array.from({ length: COPIES }, (_, index) => (
          <span className="yi-brand-marquee__unit" key={index}>
            {ITEMS.map((item, itemIndex) => (
              <Fragment key={`${index}-${item.label}`}>
                {itemIndex > 0 ? <span className="yi-brand-marquee__stars" aria-hidden="true"><i /><i /><i /></span> : null}
                <span className="yi-brand-marquee__item">
                  <Icon name={item.icon} />
                  <strong>{item.label}</strong>
                </span>
              </Fragment>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
