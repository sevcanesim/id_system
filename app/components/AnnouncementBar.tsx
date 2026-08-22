/**
 * Shared top brand ticker for public browsing chrome.
 * Quiet checkout routes hide this strip on purpose.
 */
import { Fragment } from "react";
import { Icon, type IconName } from "../icons";

const COPIES = 2;

const ITEMS: Array<{ icon: IconName; label: string }> = [
  { icon: "lock", label: "SSL şifreli hesap ve ödeme" },
  { icon: "shield", label: "Kartın iyzico’da kalır" },
  { icon: "truck", label: "Türkiye içi kargo dahil" },
  { icon: "clock", label: "2 iş gününde hazırlık" },
];

export default function AnnouncementBar() {
  return (
    <div className="yi-brand-marquee" role="note" aria-label="SSL şifreleme, iyzico ödemesi, Türkiye içi kargo ve 2 iş günü hazırlık">
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
