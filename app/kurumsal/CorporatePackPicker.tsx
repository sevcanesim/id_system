"use client";

import { useMemo, useState } from "react";
import AddToCartButton from "../components/AddToCartButton";
import { formatTryFromKurus } from "../../lib/config/product";

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
          <h3>{pack.name}</h3>
        </div>
        <div className="corporate-pack-picker__price">
          <strong>{formatTryFromKurus(pack.priceKurus)} <small>/ yıl</small></strong>
          <span>{formatTryFromKurus(pack.perSeatKurus)} kişi başı</span>
        </div>
      </div>

      <div className="corporate-pack-picker__control">
        <div className="corporate-pack-picker__ticks" role="list">
          {packs.map((item, tickIndex) => (
            <button
              key={item.code}
              type="button"
              role="listitem"
              className={`corporate-pack-picker__tick${tickIndex === index ? " is-active" : ""}${item.popular ? " is-popular" : ""}`}
              onClick={() => setIndex(tickIndex)}
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
          aria-label="Kurumsal paket kişi sayısı"
          aria-valuetext={`${pack.name}, ${pack.seats} kullanıcı, ${formatTryFromKurus(pack.priceKurus)} yıllık`}
          onChange={(event) => setIndex(Number(event.target.value))}
        />
      </div>

      <div className="corporate-pack-picker__meta">
        <span>{pack.seats} kullanıcı</span>
        <span>{pack.seats} NFC kart</span>
        <span>{pack.networkMail.toLocaleString("tr-TR")} Network Mail</span>
      </div>

      <div className="corporate-pack-picker__actions">
        {pack.checkoutLive ? (
          <AddToCartButton
            productId={productId}
            variantSku={pack.sku}
            kind="BUSINESS_CARD"
            name={pack.name}
            unitPriceKurus={pack.priceKurus}
            label="Sepete Ekle"
            className="corporate-cta"
            configuration={{ packageCode: pack.code, seatCount: pack.seats }}
          />
        ) : (
          <a href={`/kurumsal?plan=${pack.code}#teklif`} className="corporate-cta">Teklif Al</a>
        )}
        <a href="#teklif" className="corporate-secondary-cta">100+ kişi için teklif</a>
      </div>
    </div>
  );
}
