import Link from "next/link";
import { formatTryFromKurus } from "../../lib/config/product";
import { INDIVIDUAL_PREMIUM_PLAN } from "../../lib/commerce/packages";

const premiumPrice = formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus);

export function MobileStickyCta() {
  return (
    <aside
      className="home-sales-mobile-cta"
      aria-label="Premium hızlı satın alma"
    >
      <div className="home-sales-mobile-cta__copy">
        <span>ÖNERİLEN · PREMIUM</span>
        <strong>{premiumPrice} · ilk yıl dahil</strong>
      </div>
      <Link
        className="home-mockup__button home-mockup__button--gold"
        href="/urunler/nfc-kart?paket=premium"
      >
        Premium ile Başla
      </Link>
    </aside>
  );
}
