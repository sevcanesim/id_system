import Link from "next/link";
import { formatTryFromKurus } from "../../lib/config/product";
import { INDIVIDUAL_PREMIUM_PLAN } from "../../lib/commerce/packages";

const premiumPrice = formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus);

export function FinalCtaSection() {
  return (
    <section
      className="home-premium__final home-sales-final"
      aria-labelledby="final-title"
    >
      <span className="home-mockup__kicker">ÖNERİLEN · BİREYSEL PREMIUM</span>
      <h2 id="final-title">Her tanışmanın devamını elinde tut.</h2>
      <p>
        NFC + QR kartvizit, canlı profil, kişi yönetimi ve 100 Network Mail;
        profesyonel ilişkinin ilk anından sonraki adımına kadar yanında.
      </p>
      <div className="home-sales-final-offer">
        <strong>{premiumPrice}</strong>
        <span>
          1 kart · ilk yıl erişim · 100 Network Mail · kargo dahil
        </span>
      </div>
      <div className="home-mockup__actions">
        <Link
          className="home-mockup__button home-mockup__button--gold"
          href="/urunler/nfc-kart?paket=premium"
        >
          Bireysel Premium’u Seç <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
