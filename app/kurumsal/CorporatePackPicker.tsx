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

type Tier = {
  id: "START" | "BUSINESS" | "ENTERPRISE";
  title: string;
  eyebrow: string;
  description: string;
  minSeats: number;
  maxSeats: number | null;
};

const tiers: readonly Tier[] = [
  {
    id: "START",
    title: "Start",
    eyebrow: "Küçük ekipler",
    description: "İlk kurumsal standardı hızlıca kurun. Ekip büyüdükçe paketi panelden yükseltin.",
    minSeats: 2,
    maxSeats: 10,
  },
  {
    id: "BUSINESS",
    title: "Business",
    eyebrow: "Büyüyen şirketler",
    description: "Satış, saha ve yönetim ekiplerini tek standartta yönetin. Kapasiteyi ekip büyüklüğünüze göre seçin.",
    minSeats: 25,
    maxSeats: 100,
  },
  {
    id: "ENTERPRISE",
    title: "Enterprise",
    eyebrow: "100+ çalışan",
    description: "Özel kapasite, kurulum planı, raporlama ve entegrasyon ihtiyaçları için kuruma özel yapı.",
    minSeats: 101,
    maxSeats: null,
  },
] as const;

function tierForSeats(seats: number): Tier {
  return tiers.find((tier) => seats >= tier.minSeats && (tier.maxSeats === null || seats <= tier.maxSeats)) ?? tiers[0];
}

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
    const defaultIndex = packs.findIndex((pack) => pack.popular);
    return defaultIndex >= 0 ? defaultIndex : 0;
  }, [packs, initialCode]);
  const [index, setIndex] = useState(startIndex);
  const pack = packs[index] ?? packs[0];
  if (!pack) return null;

  const tier = tierForSeats(pack.seats);

  return (
    <div className="corporate-pack-picker">
      <div className="corporate-pack-picker__tiers" aria-label="Kurumsal paket seviyeleri">
        {tiers.map((tierOption) => {
          const active = tierOption.id === tier.id;
          const enterprise = tierOption.id === "ENTERPRISE";
          return (
            <button
              key={tierOption.id}
              type="button"
              className={`corporate-pack-picker__tier${active ? " is-active" : ""}${enterprise ? " corporate-pack-picker__tier--enterprise" : ""}`}
              aria-pressed={active}
              onClick={() => {
                if (enterprise) {
                  document.querySelector("#teklif")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  return;
                }
                const preferredSeats = tierOption.id === "START" ? 5 : 25;
                const nextIndex = packs.findIndex((candidate) => candidate.seats === preferredSeats);
                if (nextIndex >= 0) setIndex(nextIndex);
              }}
            >
              <span className="corporate-pack-picker__tier-status" aria-hidden="true">{active ? "Seçili" : ""}</span>
              <span className="corporate-pack-picker__tier-copy">{tierOption.eyebrow}</span>
              <strong className="corporate-pack-picker__tier-name">{tierOption.title}</strong>
              <small className="corporate-pack-picker__tier-copy">{tierOption.description}</small>
            </button>
          );
        })}
      </div>

      <div className="corporate-pack-picker__head">
        <div>
          <span className="corporate-pack-picker__kicker">{tier.title.toUpperCase()} · {pack.seats} KİŞİ</span>
          <h3>{pack.name}</h3>
          <p>İhtiyacınız değişirse kapasiteyi yeniden baskı beklemeden yükseltebilirsiniz.</p>
        </div>
        <div className="corporate-pack-picker__price">
          <strong>{formatTryFromKurus(pack.priceKurus)} <small>/ yıl</small></strong>
          <span>{formatTryFromKurus(pack.perSeatKurus)} kişi başı</span>
        </div>
      </div>

      <div className="corporate-pack-picker__control">
        <div className="corporate-pack-picker__ticks" aria-label="Ekip büyüklüğü">
          {packs.map((packOption, tickIndex) => (
            <button
              key={packOption.code}
              type="button"
              className={`corporate-pack-picker__tick${tickIndex === index ? " is-active" : ""}`}
              onClick={() => setIndex(tickIndex)}
              aria-label={`${packOption.seats} kullanıcı`}
              aria-pressed={tickIndex === index}
            >
              {packOption.seats}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={packs.length - 1}
          step={1}
          value={index}
          aria-label="Ekip büyüklüğüne göre kapasite seç"
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
            <a href="#teklif" className="home-mockup__link-secondary">100+ kişi için teklif</a>
          </>
        ) : (
          <a href={`/kurumsal?plan=${pack.code}#teklif`} className="corporate-cta">Teklif Al</a>
        )}
      </div>
    </div>
  );
}
