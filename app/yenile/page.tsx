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
  NETWORK_MAIL_CREDIT_PACKS,
  type IndividualSubscriptionOfferId,
} from "../../lib/commerce/packages";
import styles from "./RenewalPage.module.css";

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

const OFFER_COPY: Record<IndividualSubscriptionOfferId, { title: string; sku: string; priceKurus: number; label: string; message: string; facts: string[] }> = {
  BASIC_RENEWAL: {
    title: "Yenomi ID Standart — 1 Yıl Yenileme",
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
    facts: ["1 yıl Premium hizmet", "100 Network Mail eklenir; kullanılmayan kredi taşınır", "Yeni fiziksel kart gönderilmez"],
  },
  PREMIUM_UPGRADE: {
    title: "Premium yükseltme",
    sku: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.sku,
    priceKurus: COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.priceKurus,
    label: "Premium’a yükselt",
    message: INDIVIDUAL_PREMIUM_UPGRADE_MESSAGE,
    facts: ["100 Network Mail bu döneme eklenir", "Mevcut süre korunur", "İkinci NFC kart gönderilmez"],
  },
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export default function RenewalPage() {
  const [service, setService] = useState<ServiceState>({ loading: true, signedIn: false, records: [], error: "" });

  useEffect(() => {
    void (async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb) { setService((state) => ({ ...state, loading: false, error: "Hizmet bilgisi yüklenemedi." })); return; }
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setService({ loading: false, signedIn: false, records: [], error: "" }); return; }
      try {
        const response = await fetch("/api/commerce/entitlements", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error();
        setService({ loading: false, signedIn: true, records: json.renewalEntitlements ?? json.entitlements ?? [], error: "" });
      } catch {
        setService({ loading: false, signedIn: true, records: [], error: "Hizmet durumu şu anda yüklenemiyor." });
      }
    })();
  }, []);

  const current = useMemo(() => service.records.slice().sort((a, b) => String(b.expires_at || "").localeCompare(String(a.expires_at || "")))[0] || null, [service.records]);
  const expiry = current?.expires_at ? new Date(current.expires_at) : null;
  const daysLeft = expiry ? Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86_400_000)) : null;
  const isPremium = isIndividualPremiumPackage(current?.package_code);
  const offers = individualSubscriptionOffers({ signedIn: service.signedIn, hasEntitlement: Boolean(current), isPremium });
  const tone = !current ? "neutral" : daysLeft !== null && daysLeft <= 30 ? "warning" : "success";
  const label = !current ? "Aktif hizmet bulunamadı" : daysLeft !== null && daysLeft <= 30 ? "Yenileme zamanı yaklaşıyor" : "Aktif";

  return (
    <UserPanelShell activeKey="subscription" eyebrow="HİZMET" title="Hizmet & Yenileme" description="Yenileme tarihini, kalan süreyi, Premium yükseltmeyi ve paket fiyatlarını yönet.">
      <div className={styles.page}>
        {service.loading ? <Card><p>Hizmet bilgisi yükleniyor…</p></Card> : !service.signedIn ? (
          <EmptyState title="Oturum gerekli" description="Hizmet durumunu görmek için hesabına giriş yap." action={<ButtonLink href="/giris?next=%2Fyenile">Hesabına gir</ButtonLink>} />
        ) : (
          <>
            {service.error && <div className={styles.message} role="status">{service.error}</div>}
            <Card className={styles.service}>
              <div className={styles.head}>
                <div><Badge tone={tone}>{label}</Badge><h2>{isPremium ? "Yenomi ID Bireysel Premium" : "Yenomi ID Bireysel Standart"}</h2><p className={styles.copy}>Satın alınan hizmet süresi veritabanındaki gerçek başlangıç ve bitiş zamanlarından gösterilir.</p></div>
                <div className={styles.countdown}><small>YENİLEMEYE KALAN</small><strong>{daysLeft === null ? "—" : `${daysLeft} gün`}</strong><span>{daysLeft === 0 ? "Yenileme zamanı" : "Hizmet devam ediyor"}</span></div>
              </div>
              <div className={styles.facts}>
                <div className={styles.fact}><small>Başlangıç</small><strong>{formatDateTime(current?.starts_at)}</strong></div>
                <div className={styles.fact}><small>Yenileme tarihi</small><strong>{formatDateTime(current?.expires_at)}</strong></div>
                <div className={styles.fact}><small>Paket</small><strong>{isPremium ? "Premium" : "Standart"}</strong></div>
                <div className={styles.fact}><small>Network Mail</small><strong>{isPremium ? `${current?.network_mail_remaining ?? 0} / ${current?.network_mail_limit ?? 100}` : "Premium ile açılır"}</strong></div>
              </div>
              {isPremium && <div className={styles.actions}><Link className="ds-button ds-button--secondary" href="/leadler">Network Mail'i Aç</Link></div>}
            </Card>

            {offers.map((offerId) => {
              const offer = OFFER_COPY[offerId];
              return (
                <Card className={styles.offer} key={offerId}>
                  <div className={styles.head}><div><h2>{offer.title}</h2><p className={styles.copy}>{offer.message}</p></div><div className={styles.price}><strong>{formatTryFromKurus(offer.priceKurus)}</strong><span>{offerId === "PREMIUM_UPGRADE" ? "mevcut dönem" : "1 yıl"}</span></div></div>
                  <div className={styles.features}>{offer.facts.map((fact) => <div className={styles.feature} key={fact}><Icon name="check" />{fact}</div>)}</div>
                  <div className={styles.actions}><AddToCartButton productId={NFC_PRODUCT.slug} variantSku={offer.sku} kind="NFC_PHYSICAL_CARD" name={offer.title} unitPriceKurus={offer.priceKurus} label={offer.label} className="ds-button ds-button--primary" /></div>
                </Card>
              );
            })}

            <Card className={styles.pricing}>
              <div><h2>Paketler & Fiyatlandırma</h2><p className={styles.copy}>Ek Network Mail paketleri fiyat görünürlüğü için listelenir. Checkout aktif olmayan paketlerde satın alma butonu gösterilmez.</p></div>
              <div className={styles.packGrid}>
                {NETWORK_MAIL_CREDIT_PACKS.map((pack) => <div className={styles.pack} key={pack.sku}><small>NETWORK MAIL</small><strong>{pack.credits.toLocaleString("tr-TR")} adet</strong><span>{formatTryFromKurus(pack.priceKurus)}</span><span>{pack.liveCheckout ? "Satışta" : "Satış yakında"}</span></div>)}
              </div>
            </Card>

            {!current && <EmptyState title="Aktif hizmet yok" description="Yenileme veya Premium yükseltme için önce bireysel Standart kart paketini al." action={<ButtonLink href="/urunler/nfc-kart">NFC Kartı Satın Al</ButtonLink>} />}
          </>
        )}
      </div>
    </UserPanelShell>
  );
}
