"use client";

import Link from "next/link";
import { formatTryFromKurus } from "../../../lib/config/product";
import { COMMERCIAL_PRICING } from "../../../lib/config/commercial";
import { useNfcPackage } from "./NfcPackageContext";

const individualItems = [
  "1 adet kişisel NFC + QR kart",
  "1 yıl platform erişimi",
  "Sınırsız profil güncelleme",
  "Kayıp modu ve yedek kart desteği",
];

const premiumItems = [
  "Bireysel paketteki tüm özellikler",
  "100 Network Mail kredisi",
  "Lead ve kişi yönetimi",
  "Toplantı ve sunum araçları",
];

export default function NfcIncludesPanel() {
  const { packageId } = useNfcPackage();
  const premium = packageId === "premium";
  const items = premium ? premiumItems : individualItems;
  const priceKurus = premium
    ? COMMERCIAL_PRICING.YENOMI_ID_PREMIUM.priceKurus
    : COMMERCIAL_PRICING.YENOMI_ID_INITIAL.priceKurus;

  return (
    <section className={`nfc-includes${premium ? " nfc-includes--premium" : ""}`}>
      <div className="yi-container nfc-includes__grid">
        <div>
          <span className="nfc-kicker">{premium ? "BİREYSEL PREMIUM’DA AYRICA" : "BİREYSEL NFC’YE DAHİL"}</span>
          <h2>{premium ? <>Kartvizitten sonra<br />bağlantıyı ilerlet.</> : <>Kartın ve profilin.<br />İlk yıl birlikte.</>}</h2>
        </div>
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="nfc-includes__cta">
          <span>{premium ? "Bireysel Premium · ilk yıl" : "Bireysel NFC · ilk yıl"}</span>
          <strong>{formatTryFromKurus(priceKurus)}</strong>
          <small>{premium ? `2. yıldan itibaren ${formatTryFromKurus(COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.priceKurus)}/yıl · yeni kart gerekmez` : `2. yıldan itibaren ${formatTryFromKurus(COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus)}/yıl · yeni kart gerekmez`}</small>
          <Link className="home-mockup__link-secondary" href="#nfc-hero-price-row">
            {premium ? "Bireysel Premium’u Seç" : "Bireysel NFC’yi Seç"}
          </Link>
        </div>
      </div>
    </section>
  );
}
