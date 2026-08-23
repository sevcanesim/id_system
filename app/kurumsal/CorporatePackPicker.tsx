"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "../components/AddToCartButton";
import { formatTryFromKurus } from "../../lib/config/product";
import { CORPORATE_SHARED_FEATURES } from "../../lib/commerce/packages";

export type CorporatePackOption = {
  code: string;
  name: string;
  seats: number;
  priceKurus: number;
  perSeatKurus: number;
  networkMail: number;
  popular: boolean;
  checkoutLive: boolean;
  sku: string;
};

export default function CorporatePackPicker({
  packs,
  productId,
  initialCode,
}: {
  packs: readonly CorporatePackOption[];
  productId: string;
  initialCode?: string;
}) {
  const startIndex = useMemo(() => {
    const fromQuery = packs.findIndex((pack) => pack.code === initialCode);
    if (fromQuery >= 0) return fromQuery;
    const popular = packs.findIndex((pack) => pack.popular);
    return popular >= 0 ? popular : 0;
  }, [packs, initialCode]);
  const [index, setIndex] = useState(startIndex);
  const pack = packs[index] ?? packs[0];
  if (!pack) return null;

  return (
    <div className="corporate-pack-picker">
      <div className="corporate-pack-picker__head">
        <div>
          <span className="corporate-pack-picker__kicker">{pack.code}</span>
          <h3>{pack.name}{pack.popular ? <span className="corporate-pack-picker__badge">En çok tercih edilen</span> : null}</h3>
        </div>
        <div className="corporate-pack-picker__price">
          <strong>{formatTryFromKurus(pack.priceKurus)} <small>/ yıl</small></strong>
          <span>{formatTryFromKurus(pack.perSeatKurus)} kişi başı</span>
        </div>
      </div>

      <div className="corporate-pack-picker__control">
        <div className="corporate-pack-picker__ticks" role="list" aria-label="Ekip büyüklüğü">
          {packs.map((item, tickIndex) => (
            <button
              key={item.code}
              type="button"
              role="listitem"
              className={`corporate-pack-picker__tick${tickIndex === index ? " is-active" : ""}${item.popular ? " is-popular" : ""}`}
              onClick={() => setIndex(tickIndex)}
              aria-label={`${item.seats} kullanıcı${item.popular ? ", en çok tercih edilen paket" : ""}`}
              aria-pressed={tickIndex === index}
            >
              {item.seats}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={packs.length - 1}
          step={1}
          value={index}
          aria-label="Ekip büyüklüğüne göre paket seç"
          aria-valuetext={`${pack.name}, ${pack.seats} kullanıcı, ${formatTryFromKurus(pack.priceKurus)} yıllık`}
          onChange={(event) => setIndex(Number(event.target.value))}
        />
      </div>

      <div className="corporate-pack-picker__meta" aria-label="Pakete dahil kapasite">
        <span>{pack.seats} kullanıcı</span>
        <span>{pack.seats} NFC kart</span>
        <span>{pack.networkMail.toLocaleString("tr-TR")} Network Mail kredisi</span>
      </div>

      <ul className="corporate-pack-picker__features" aria-label="Pakete dahil">
        {CORPORATE_SHARED_FEATURES.slice(0, 8).map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>

      <div className="corporate-pack-picker__actions">
        {pack.checkoutLive ? (
          <>
            <AddToCartButton
              productId={productId}
              variantSku={pack.sku}
              kind="BUSINESS_CARD"
              name={pack.name}
              unitPriceKurus={pack.priceKurus}
              label="Ekibimi Kur"
              className="corporate-cta"
              configuration={{ packageCode: pack.code, seatCount: pack.seats }}
            />
            <a href="#teklif" className="home-mockup__link-secondary">100+ kişi için kurumsal teklif</a>
          </>
        ) : (
          <a href={`/kurumsal?plan=${pack.code}#teklif`} className="corporate-cta">Kurumsal Teklif Al</a>
        )}
      </div>
    </div>
  );
}
