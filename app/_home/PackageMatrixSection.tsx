import Link from "next/link";
import { formatTryFromKurus } from "../../lib/config/product";
import {
  CORPORATE_PACKAGE_LADDER,
  INDIVIDUAL_PLAN,
  INDIVIDUAL_PREMIUM_PLAN,
} from "../../lib/commerce/packages";
import { Icon } from "../icons";

const individualPrice = formatTryFromKurus(INDIVIDUAL_PLAN.priceKurus);
const premiumPrice = formatTryFromKurus(INDIVIDUAL_PREMIUM_PLAN.priceKurus);
const corporateEntryPrice = formatTryFromKurus(
  CORPORATE_PACKAGE_LADDER[0].priceKurus,
);

const packageComparisonRows = [
  ["Fiyat", individualPrice, premiumPrice, `${corporateEntryPrice}’dan başlar`],
  [
    "En uygun kullanım",
    "Dijital kartvizit paylaşımı",
    "Networking ve satış takibi",
    "Çalışan ve kart yönetimi",
  ],
  ["NFC + QR kart", "included", "included", "Kişi sayısı kadar"],
  ["Kişi / lead toplama", "unavailable", "included", "included"],
  ["Toplantı ve sunum", "unavailable", "included", "included"],
  ["Follow-up e-posta", "—", "100 Network Mail", "Kişi başı 100 Network Mail"],
  ["Merkezi çalışan yönetimi", "unavailable", "unavailable", "included"],
  ["Rol, departman ve durum", "unavailable", "unavailable", "included"],
  ["Kurumsal marka standardı", "unavailable", "unavailable", "included"],
] as const;

const mobilePackages = [
  {
    name: "Bireysel",
    price: individualPrice,
    valueIndex: 1,
    href: "/urunler/nfc-kart?paket=individual",
    action: "Bireysel’i İncele",
  },
  {
    name: "Premium",
    price: premiumPrice,
    valueIndex: 2,
    href: "/urunler/nfc-kart?paket=premium",
    action: "Premium ile Başla",
  },
  {
    name: "Kurumsal",
    price: `${corporateEntryPrice}’dan başlar`,
    valueIndex: 3,
    href: "/kurumsal",
    action: "Kurumsal Paketler",
  },
] as const;

function PackageComparisonValue({ value }: { value: string }) {
  if (value === "included") {
    return (
      <span className="home-package-matrix__availability is-included">
        <Icon name="check" />
        <span className="sr-only">Dahil</span>
      </span>
    );
  }
  if (value === "unavailable") {
    return (
      <span className="home-package-matrix__availability is-unavailable">
        <span aria-hidden="true">—</span>
        <span className="sr-only">Yok</span>
      </span>
    );
  }
  return <>{value}</>;
}

export function PackageMatrixSection() {
  return (
    <section className="home-package-matrix" aria-labelledby="paths-title">
      <div className="home-package-matrix__head">
        <span className="home-mockup__kicker">
          BİREYSEL · PREMIUM · KURUMSAL
        </span>
        <h2 id="paths-title">Hangisi sana uygun?</h2>
        <p>
          Bireysel kartvizit paylaşımı için; Premium networking ve takip
          için; Kurumsal ekip yönetimi için.
        </p>
      </div>
      <div
        className="home-package-matrix__scroll"
        role="region"
        aria-label="Paket karşılaştırma tablosu"
        tabIndex={0}
      >
        <div
          className="home-package-matrix__table"
          role="table"
          aria-label="Paket karşılaştırması"
        >
          <div
            className="home-package-matrix__row home-package-matrix__header"
            role="row"
          >
            <span role="columnheader" aria-label="Özellik" />
            <strong role="columnheader">Bireysel</strong>
            <strong role="columnheader">Premium</strong>
            <strong role="columnheader">Kurumsal</strong>
          </div>
          {packageComparisonRows.map(([label, a, b, c]) => (
            <div
              className="home-package-matrix__row"
              role="row"
              key={label}
            >
              <strong role="rowheader">{label}</strong>
              <span role="cell">
                <PackageComparisonValue value={a} />
              </span>
              <span role="cell">
                <PackageComparisonValue value={b} />
              </span>
              <span role="cell">
                <PackageComparisonValue value={c} />
              </span>
            </div>
          ))}
          <div
            className="home-package-matrix__row home-package-matrix__actions"
            role="row"
          >
            <span role="rowheader">Seç</span>
            <span role="cell">
              <Link href="/urunler/nfc-kart?paket=individual">
                Bireysel’i İncele →
              </Link>
            </span>
            <span role="cell">
              <Link href="/urunler/nfc-kart?paket=premium">
                Premium ile Başla →
              </Link>
            </span>
            <span role="cell">
              <Link href="/kurumsal">Kurumsal Paketler →</Link>
            </span>
          </div>
        </div>
      </div>
      <div
        className="home-package-matrix__mobile-cards"
        aria-label="Paket karşılaştırması"
      >
        {mobilePackages.map((plan) => (
          <details key={plan.name} open={plan.name === "Premium"}>
            <summary>
              <span>
                <strong>{plan.name}</strong>
                <small>{plan.price}</small>
              </span>
              <span aria-hidden="true">⌄</span>
            </summary>
            <ul>
              {packageComparisonRows.slice(1).map((row) => (
                <li key={row[0]}>
                  <span>{row[0]}</span>
                  <strong>
                    <PackageComparisonValue value={row[plan.valueIndex]} />
                  </strong>
                </li>
              ))}
            </ul>
            <Link href={plan.href}>{plan.action} →</Link>
          </details>
        ))}
      </div>
    </section>
  );
}
