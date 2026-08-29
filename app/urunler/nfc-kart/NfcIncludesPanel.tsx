"use client";

import Link from "next/link";
import { formatTryFromKurus } from "../../../lib/config/product";
import { COMMERCIAL_PRICING } from "../../../lib/config/commercial";
import { useNfcPackage } from "./NfcPackageContext";

const individualItems = [
  "1 adet kişisel NFC kart",
  "Değişmeyen kişisel QR kod",
  "1 yıl platform üyeliği dahil",
  "Aktif dönemde sınırsız bilgi güncelleme",
  "Kayıp modu ve yedek kart desteği",
  "Türkiye içi standart kargo dahil",
];

const premiumItems = [
  "NFC paketteki tüm özellikler",
  "500 Network Mail kredisi",
  "Lead ve kişi yönetimi",
  "Toplantı ve sunum araçları",
  "Gelişmiş networking özellikleri",
  "Türkiye içi standart kargo dahil",
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
          <span className="nfc-kicker">{premium ? "PREMIUM PAKET" : "NE ALIYORSUN?"}</span>
          <h2>{premium ? <>Daha fazla bağlantı.<br />Daha güçlü takip.</> : <>Karttan fazlası.<br />Kimliğin sende kalır.</>}</h2>
        </div>
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <div className="nfc-includes__cta">
          <span>{premium ? "Premium · tek seferlik" : "Tek seferlik, kargo dahil"}</span>
          <strong>{formatTryFromKurus(priceKurus)}</strong>
          <small>{premium ? "NFC kart • 1 yıl • 500 Network Mail" : "1 kart • 1 yıl dahil • Türkiye içi teslimat"}</small>
          <Link className="home-mockup__link-secondary" href="#nfc-hero-price-row">
            {premium ? "Premium’u Seç" : "Sepete Ekle"}
          </Link>
        </div>
      </div>
    </section>
  );
}
