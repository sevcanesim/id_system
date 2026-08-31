"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UserPanelShell from "../components/UserPanelShell";
import AddToCartButton from "../components/AddToCartButton";
import { Icon } from "../icons";
import { Badge, ButtonLink, Card, EmptyState } from "../components/ui";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import {
  COMMERCIAL_PRICING,
  INDIVIDUAL_PREMIUM_RENEWAL_MESSAGE,
  INDIVIDUAL_PREMIUM_UPGRADE_MESSAGE,
  INDIVIDUAL_RENEWAL_MESSAGE,
} from "../../lib/config/commercial";
import { formatTryFromKurus, NFC_PRODUCT } from "../../lib/config/product";
import {
  individualSubscriptionOffers,
  isIndividualPremiumPackage,
  type IndividualSubscriptionOfferId,
} from "../../lib/commerce/packages";
import "./renewal.css";

type ServiceRecord = {
  id: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  grace_ends_at: string | null;
  package_code?: string | null;
  network_mail_limit?: number | null;
  network_mail_remaining?: number | null;
};
type ServiceState = { loading: boolean; signedIn: boolean; records: ServiceRecord[]; error: string };

const OFFER_COPY: Record<IndividualSubscriptionOfferId, {
  title: string;
  sku: string;
  priceKurus: number;
  label: string;
  message: string;
  facts: string[];
}> = {
  BASIC_RENEWAL: {
    title: "Yenomi ID Dijital Hizmet — 1 Yıl Yenileme",
    sku: COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.sku,
    priceKurus: COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus,
    label: "1 Yıl Yenile",
    message: INDIVIDUAL_RENEWAL_MESSAGE,
    facts: ["1 yıl dijital kartvizit hizmeti", "Mevcut profil ve bağlantılar korunur", "Yeni fiziksel kart gönderilmez"],
  },
  PREMIUM_RENEWAL: {
    title: "Premium — 1 Yıl Yenileme",
    sku: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.sku,
    priceKurus: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.priceKurus,
    label: "Premium’u yenile",
    message: INDIVIDUAL_PREMIUM_RENEWAL_MESSAGE,
    facts: ["1 yıl Premium hizmet", "500 Network Mail eklenir; kullanılmayan kredi taşınır", "Yeni fiziksel kart gönderilmez"],
  },
  PREMIUM_UPGRADE: {
    title: "Premium yükseltme",
    sku: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.sku,
    priceKurus: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.priceKurus,
    label: "Premium’a yükselt",
    message: INDIVIDUAL_PREMIUM_UPGRADE_MESSAGE,
    facts: ["500 Network Mail bu döneme eklenir", "Mevcut süre korunur", "İkinci NFC kart gönderilmez"],
  },
};

export default function RenewalPage() {
  const [service, setService] = useState<ServiceState>({ loading: true, signedIn: false, records: [], error: "" });
  useEffect(() => {
    void (async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) {
        setService((s) => ({ ...s, loading: false, error: "Hizmet bilgisi yüklenemedi." }));
        return;
      }
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setService({ loading: false, signedIn: false, records: [], error: "" });
        return;
      }
      try {
        const r = await fetch("/api/commerce/entitlements", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const json = await r.json();
        if (!r.ok) throw new Error();
        setService({
          loading: false,
          signedIn: true,
          records: json.renewalEntitlements ?? json.entitlements ?? [],
          error: "",
        });
      } catch {
        setService({ loading: false, signedIn: true, records: [], error: "Hizmet durumu şu anda yüklenemiyor." });
      }
    })();
  }, []);
  const current = useMemo(
    () => service.records.slice().sort((a, b) => String(b.expires_at || "").localeCompare(String(a.expires_at || "")))[0] || null,
    [service.records],
  );
  const expiry = current?.expires_at ? new Date(current.expires_at) : null;
  const daysLeft = expiry ? Math.ceil((expiry.getTime() - Date.now()) / 86400000) : null;
  const isPremium = isIndividualPremiumPackage(current?.package_code);
  const offers = individualSubscriptionOffers({
    signedIn: service.signedIn,
    hasEntitlement: Boolean(current),
    isPremium,
  });
  const tone = !current ? "neutral" : daysLeft !== null && daysLeft <= 30 ? "warning" : "success";
  const label = !current ? "Aktif hizmet bulunamadı" : daysLeft !== null && daysLeft <= 30 ? "Yenileme zamanı yaklaşıyor" : "Aktif";
  return (
    <UserPanelShell activeKey="subscription" eyebrow="HESAP" title="Abonelik" description="Dijital kartvizit hizmetinizin durumunu, bitiş tarihini ve yenileme işlemini yönetin.">
      <div className="renewal-page">
        {service.loading ? (
          <Card><p className="p9-section-copy">Hizmet bilgisi yükleniyor…</p></Card>
        ) : !service.signedIn ? (
          <EmptyState title="Oturum gerekli" description="Abonelik durumunu görmek için hesabınıza giriş yapın." action={<ButtonLink href="/giris?next=%2Fyenile" variant="primary">Hesabına gir</ButtonLink>} />
        ) : (
          <div className="p9-stack">
            {service.error && <div className="p9-message" role="status">{service.error}</div>}
            <Card className="p9-service">
              <div className="p9-service__head">
                <div>
                  <Badge tone={tone}>{label}</Badge>
                  <h2>{isPremium ? "Yenomi ID Bireysel Premium" : "Yenomi ID Dijital Hizmet"}</h2>
                  <p className="p9-section-copy">Kalıcı profil bağlantınızı ve dijital kartvizit hizmetinizi aynı kartla kullanmaya devam edin.</p>
                </div>
              </div>
              <div className="p9-service-facts">
                <div className="p9-service-fact"><small>Durum</small><strong>{current ? "Kayıtlı" : "Yenileme gerekli"}</strong></div>
                <div className="p9-service-fact"><small>Bitiş tarihi</small><strong>{expiry ? expiry.toLocaleDateString("tr-TR") : "—"}</strong></div>
                <div className="p9-service-fact"><small>Kalan süre</small><strong>{daysLeft === null ? "—" : daysLeft > 0 ? `${daysLeft} gün` : "Süre doldu"}</strong></div>
                {isPremium && (
                  <div className="p9-service-fact">
                    <small>Network Mail</small>
                    <strong>{current?.network_mail_remaining ?? 0} / {current?.network_mail_limit ?? 0}</strong>
                  </div>
                )}
              </div>
              {isPremium && (
                <div className="p9-service-actions">
                  <Link className="ds-button ds-button--secondary" href="/leadler">Leadleri ve mailleri aç</Link>
                </div>
              )}
            </Card>
            {offers.map((offerId) => {
              const offer = OFFER_COPY[offerId];
              return (
                <Card className="p9-service" key={offerId}>
                  <div className="p9-service__head">
                    <div>
                      <h2>{offer.title}</h2>
                      <p className="p9-section-copy">{offer.message}</p>
                    </div>
                    <div className="p9-price"><strong>{formatTryFromKurus(offer.priceKurus)}</strong><small>/ {offerId === "PREMIUM_UPGRADE" ? "dönem" : "yıl"}</small></div>
                  </div>
                  <div className="p9-feature-list">
                    {offer.facts.map((fact) => (
                      <div className="p9-feature" key={fact}><Icon name="check" />{fact}</div>
                    ))}
                  </div>
                  <div className="p9-service-actions">
                    <AddToCartButton
                      productId={NFC_PRODUCT.slug}
                      variantSku={offer.sku}
                      kind="NFC_PHYSICAL_CARD"
                      name={offer.title}
                      unitPriceKurus={offer.priceKurus}
                      label={offer.label}
                      className="ds-button ds-button--primary"
                    />
                  </div>
                </Card>
              );
            })}
            {!current && (
              <EmptyState title="Satın alınacak hizmet yok" description="Yenileme veya yükseltme için önce bireysel kart paketini alın." action={<ButtonLink href="/urunler/nfc-kart" variant="primary">NFC Kartı Satın Al</ButtonLink>} />
            )}
          </div>
        )}
      </div>
    </UserPanelShell>
  );
}
