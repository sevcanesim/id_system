"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import UserPanelShell from "../components/UserPanelShell";
import { Alert, Button, ButtonLink, Card, Field, Input, StatusBadge } from "../components/ui";
import AddToCartButton from "../components/AddToCartButton";
import { Icon } from "../icons";
import { isIndividualPremiumPackage } from "../../lib/commerce/packages";
import { COMMERCIAL_PRICING } from "../../lib/config/commercial";
import { NFC_PRODUCT, formatTryFromKurus } from "../../lib/config/product";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import ResumePaymentButton from "../siparislerim/ResumePaymentButton";
import styles from "./SettingsLayout.module.css";

type Entitlement = {
  id: string;
  status: string;
  starts_at: string | null;
  expires_at: string | null;
  grace_ends_at: string | null;
  package_code: string | null;
  network_mail_limit: number | null;
  network_mail_remaining: number | null;
};

type SubscriptionState = {
  loading: boolean;
  entitlement: Entitlement | null;
  error: boolean;
};

type CommerceStatus = "DRAFT" | "AWAITING_PAYMENT" | "PAID" | "PREPARING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
type OperationalStatus = "PROFILE_REQUIRED" | "PRINT_PENDING" | "PRINTING" | "SHIPPING_PENDING" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
type PhysicalUnit = {
  id: string;
  operations_status: OperationalStatus;
  carrier: string | null;
  tracking_number: string | null;
  print_requested_at: string | null;
  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
};
type CommerceOrder = {
  id: string;
  order_number: string;
  status: CommerceStatus;
  total_kurus: number;
  paid_at: string | null;
  created_at: string;
  commerce_order_items: Array<{
    id: string;
    product_name: string;
    product_kind: string;
    quantity: number;
    configuration: { sku?: unknown } | null;
    commerce_physical_card_units?: PhysicalUnit[];
  }>;
};
type OrdersState = { loading: boolean; orders: CommerceOrder[]; error: boolean };
type StatusTone = "neutral" | "success" | "warning" | "error" | "info";
type AccountSnapshot = { name: string; email: string };

const ORDER_STATUS: Record<CommerceStatus, { label: string; description: string; tone: StatusTone }> = {
  DRAFT: { label: "Taslak", description: "Sipariş henüz tamamlanmadı.", tone: "neutral" },
  AWAITING_PAYMENT: { label: "Ödeme bekleniyor", description: "Ödemeyi tamamladığınızda hazırlık süreci başlar.", tone: "warning" },
  PAID: { label: "Ödeme alındı", description: "Sipariş doğrulandı ve hazırlık sırasına alındı.", tone: "info" },
  PREPARING: { label: "Hazırlanıyor", description: "Kart üretim ve kalite kontrol aşamasında.", tone: "info" },
  SHIPPED: { label: "Kargolandı", description: "Sipariş teslimat adresine doğru yola çıktı.", tone: "info" },
  COMPLETED: { label: "Teslim edildi", description: "Sipariş süreci tamamlandı.", tone: "success" },
  CANCELLED: { label: "İptal edildi", description: "Sipariş iptal edildi.", tone: "error" },
  REFUNDED: { label: "İade edildi", description: "Ödeme iade edildi ve ilgili dijital hizmet durduruldu.", tone: "error" },
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(value));
}

function remainingDays(value?: string | null) {
  if (!value) return null;
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000));
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function operationStep(status: OperationalStatus) {
  if (["PROFILE_REQUIRED", "PRINT_PENDING", "PRINTING", "SHIPPING_PENDING"].includes(status)) return 0;
  if (status === "IN_TRANSIT") return 1;
  if (status === "OUT_FOR_DELIVERY") return 2;
  if (status === "DELIVERED") return 3;
  return 0;
}

function currentBrowserLabel() {
  const userAgent = navigator.userAgent;
  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Chrome\//.test(userAgent)
      ? "Chrome"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Bu tarayıcı";
  const platform = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : "Bu cihaz";
  return `${browser} · ${platform}`;
}

function subscriptionName(entitlement: Entitlement | null) {
  if (!entitlement) return "Aktif paket bulunamadı";
  if (isIndividualPremiumPackage(entitlement.package_code)) return "Yenomi ID Bireysel Premium";
  if (entitlement.package_code === "INDIVIDUAL_DIGITAL") return "Yenomi ID Dijital";
  return "Yenomi ID Bireysel Standart";
}

function paymentIsCollected(status: CommerceStatus) {
  return ["PAID", "PREPARING", "SHIPPED", "COMPLETED"].includes(status);
}

function orderPresentation(order: CommerceOrder) {
  const skus = order.commerce_order_items
    .map((item) => String(item.configuration?.sku || "").toUpperCase())
    .filter(Boolean);
  const includesSku = (fragment: string) => skus.some((sku) => sku.includes(fragment));

  if (includesSku("PREMIUM-UPGRADE")) {
    return { title: "Yenomi ID Premium yükseltme", description: "Premium özellikler hesabınıza ekleniyor." };
  }
  if (includesSku("RENEWAL")) {
    return { title: "Yenomi ID hizmet yenileme", description: "Hizmet süreniz bir yıl uzatılıyor." };
  }
  if (includesSku("NFC-EXTRA")) {
    return { title: "Ek Yenomi ID kartı", description: "Ek fiziksel kartınız hazırlanıyor." };
  }
  if (includesSku("NFC-REPLACEMENT")) {
    return { title: "Yenomi ID yedek kartı", description: "Yedek kartınız hazırlanıyor." };
  }
  if (includesSku("DIGITAL")) {
    return { title: "Yenomi ID dijital profil hizmeti", description: "Dijital profil hizmetiniz hazırlanıyor." };
  }
  if (includesSku("PREMIUM")) {
    return { title: "Yenomi ID Premium kart paketi", description: "NFC kartınız ve Premium dijital profiliniz hazırlanıyor." };
  }
  if (order.commerce_order_items.some((item) => item.product_kind === "NFC_PHYSICAL_CARD")) {
    return { title: "Yenomi ID kart paketi", description: "NFC kartınız ve dijital profil hizmetiniz hazırlanıyor." };
  }
  return { title: "Yenomi ID hizmeti", description: "Seçtiğiniz hizmet paketi hazırlanıyor." };
}

function fulfillmentStartDetail(unit: PhysicalUnit) {
  if (unit.print_requested_at) return formatDateTime(unit.print_requested_at);
  if (unit.operations_status === "PROFILE_REQUIRED") return "Profil bilgileri bekleniyor";
  if (unit.operations_status === "PRINTING") return "Kartınız basılıyor";
  if (unit.operations_status === "SHIPPING_PENDING") return "Kargoya hazırlanıyor";
  return "Sırada";
}

function OrderFulfillmentStepper({ order, unit }: { order: CommerceOrder; unit: PhysicalUnit }) {
  if (!paymentIsCollected(order.status)) return null;

  const currentFulfillmentStep = operationStep(unit.operations_status);
  const steps = [
    { title: "Ödeme", detail: order.paid_at ? formatDateTime(order.paid_at) : "Ödeme alındı" },
    { title: "Hazırlanıyor", detail: fulfillmentStartDetail(unit) },
    { title: "Kargoya verildi", detail: unit.shipped_at ? formatDateTime(unit.shipped_at) : "Bekleniyor" },
    { title: "Dağıtımda", detail: unit.out_for_delivery_at ? formatDateTime(unit.out_for_delivery_at) : "Bekleniyor" },
    { title: "Teslim edildi", detail: unit.delivered_at ? formatDateTime(unit.delivered_at) : "Bekleniyor" },
  ];

  return (
    <section className={styles.fulfillment} aria-labelledby={`fulfillment-${order.id}`}>
      <div className={styles.fulfillmentHeader}>
        <div>
          <h4 id={`fulfillment-${order.id}`}>Sipariş ve kargo süreci</h4>
          <p>{unit.tracking_number ? `${unit.carrier || "Kargo"} · ${unit.tracking_number}` : "Kargo bilgisi hazır olduğunda burada görünür."}</p>
        </div>
      </div>
      <ol className={styles.fulfillmentSteps}>
        {steps.map((step, index) => {
          const fulfillmentIndex = index - 1;
          const state = index === 0
            ? "complete"
            : fulfillmentIndex < currentFulfillmentStep
              ? "complete"
              : fulfillmentIndex === currentFulfillmentStep
                ? "current"
                : "upcoming";
          return (
            <li data-state={state} key={step.title}>
              <small>{String(index + 1).padStart(2, "0")}</small>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [yenomiId, setYenomiId] = useState("");
  const [accountSnapshot, setAccountSnapshot] = useState<AccountSnapshot>({ name: "", email: "" });
  const [password, setPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountMessageTone, setAccountMessageTone] = useState<"success" | "error">("success");
  const [securityMessage, setSecurityMessage] = useState("");
  const [securityMessageTone, setSecurityMessageTone] = useState<"success" | "error">("success");
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [browserLabel, setBrowserLabel] = useState("Bu cihaz");
  const [subscription, setSubscription] = useState<SubscriptionState>({ loading: true, entitlement: null, error: false });
  const [ordersState, setOrdersState] = useState<OrdersState>({ loading: true, orders: [], error: false });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        if (!cancelled) router.replace("/giris?next=%2Fayarlar");
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!data.user) {
        router.replace("/giris?next=%2Fayarlar");
        return;
      }

      const nextEmail = data.user.email || "";
      const nextName = String(data.user.user_metadata?.name || data.user.user_metadata?.full_name || "");
      setEmail(nextEmail);
      setName(nextName);
      setAccountSnapshot({ name: nextName, email: nextEmail });
      setBrowserLabel(currentBrowserLabel());

      const { data: account } = await supabase
        .from("user_accounts")
        .select("yenomi_id")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!cancelled) setYenomiId(typeof account?.yenomi_id === "string" ? account.yenomi_id : "");

      const { data: sessionData } = await supabase?.auth.getSession() || { data: { session: null } };
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        if (!cancelled) setSubscription({ loading: false, entitlement: null, error: false });
        return;
      }

      try {
        const response = await fetch("/api/commerce/entitlements", {
          headers: { authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("ENTITLEMENT_UNAVAILABLE");
        const payload = await response.json() as { entitlements?: Entitlement[] };
        const entitlement = (payload.entitlements || [])
          .slice()
          .sort((left, right) => String(right.expires_at || "").localeCompare(String(left.expires_at || "")))[0] || null;
        if (!cancelled) setSubscription({ loading: false, entitlement, error: false });
      } catch {
        if (!cancelled) setSubscription({ loading: false, entitlement: null, error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase?.auth.getSession() || { data: { session: null } };
      const accessToken = data.session?.access_token;
      if (!accessToken) {
        if (!cancelled) setOrdersState({ loading: false, orders: [], error: false });
        return;
      }
      try {
        const response = await fetch("/api/commerce/orders", {
          headers: { authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("ORDERS_UNAVAILABLE");
        const payload = await response.json() as { orders?: CommerceOrder[] };
        if (!cancelled) setOrdersState({ loading: false, orders: payload.orders || [], error: false });
      } catch {
        if (!cancelled) setOrdersState({ loading: false, orders: [], error: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const daysLeft = useMemo(() => remainingDays(subscription.entitlement?.expires_at), [subscription.entitlement?.expires_at]);
  const hasPremium = isIndividualPremiumPackage(subscription.entitlement?.package_code);
  const hasNetworkMail = (subscription.entitlement?.network_mail_limit || 0) > 0;
  const renewalWindowOpen = daysLeft !== null && daysLeft <= 30;
  const accountDirty = name.trim() !== accountSnapshot.name || email.trim() !== accountSnapshot.email;

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !accountDirty) return;
    setSavingAccount(true);
    setAccountMessage("");

    const { error } = await supabase.auth.updateUser({
      email: email.trim(),
      data: { name: name.trim() },
    });

    if (error) {
      setAccountMessageTone("error");
      setAccountMessage("Hesap bilgileri kaydedilemedi. E-posta adresini kontrol edip tekrar deneyin.");
    } else {
      const updatedAccount = { name: name.trim(), email: email.trim() };
      setAccountSnapshot(updatedAccount);
      setAccountMessageTone("success");
      setAccountMessage("Hesap bilgileriniz güncellendi. E-posta değiştiyse doğrulama bağlantısını gelen kutunuzdan onaylayın.");
    }
    setSavingAccount(false);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase || password.trim().length < 8) return;
    setSavingPassword(true);
    setSecurityMessage("");

    const { error } = await supabase.auth.updateUser({ password });
    setSecurityMessageTone(error ? "error" : "success");
    setSecurityMessage(error ? "Şifre güncellenemedi. En az 8 karakter kullandığınızdan emin olup tekrar deneyin." : "Şifreniz güncellendi.");
    if (!error) setPassword("");
    setSavingPassword(false);
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.replace("/giris");
  }

  return (
    <UserPanelShell
      activeKey="account"
      eyebrow="HESAP"
      title="Hesap & Abonelik"
      description="Hesap bilgilerinizi, hizmetinizi, güvenliğinizi ve oturumunuzu tek yerden yönetin."
    >
      <div className={styles.page}>
        <Card className={styles.subscriptionCard}>
          <div className={styles.subscriptionMain}>
            <div className={styles.countdown} aria-live="polite">
              <strong>{subscription.loading ? "—" : subscription.error ? "?" : daysLeft === null ? "∞" : daysLeft}</strong>
              <span>{subscription.loading ? "HİZMET" : subscription.error ? "DURUM" : daysLeft === null ? "AKTİF" : "GÜN KALDI"}</span>
            </div>
            <div className={styles.subscriptionCopy}>
              <span className={styles.sectionEyebrow}><Icon name="shield" /> AKTİF HİZMET</span>
              <h2>{subscription.loading ? "Hizmet bilgisi yükleniyor" : subscriptionName(subscription.entitlement)}</h2>
              <p>{subscription.error
                ? "Hizmet bilgisi şu anda yüklenemedi. Yenileme sayfasından tekrar deneyebilirsiniz."
                : subscription.entitlement
                  ? `${hasPremium ? "Premium özellikleriniz" : "Dijital kart hizmetiniz"} aktif durumda.${hasNetworkMail ? ` ${subscription.entitlement.network_mail_remaining ?? 0} Network Mail krediniz kaldı.` : ""}`
                  : "Aktif hizmetiniz bulunmuyor. Kart ve dijital profil paketlerini inceleyebilirsiniz."}</p>
            </div>
            <div className={styles.subscriptionActions}>
              <ButtonLink href="#renewal-options" variant={renewalWindowOpen ? "primary" : "secondary"} size="sm"><Icon name="refresh" /> {renewalWindowOpen ? "Yenileme seçeneklerini aç" : "Hizmeti Yönet"}</ButtonLink>
              {!subscription.loading && !subscription.entitlement && <ButtonLink href="/urunler/nfc-kart" variant="primary" size="sm">Paketleri Gör</ButtonLink>}
            </div>
          </div>
          <div className={styles.subscriptionFacts}>
            <div><span>Başlangıç</span><strong>{formatDate(subscription.entitlement?.starts_at)}</strong></div>
            <div><span>Yenileme tarihi</span><strong>{formatDate(subscription.entitlement?.expires_at)}</strong></div>
            <div><span>Plan</span><strong>{subscription.loading ? "—" : hasPremium ? "Premium" : subscription.entitlement ? "Standart" : "—"}</strong></div>
          </div>
        </Card>

        <section className={styles.renewalSection} id="renewal-options" aria-labelledby="renewal-options-title">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}><Icon name="refresh" /> ABONELİK</span>
              <h2 id="renewal-options-title">Plan ve yenileme seçenekleri</h2>
              <p>Hizmet sürenizi, Premium erişiminizi ve yenileme seçeneklerinizi bu sayfadan yönetin.</p>
            </div>
          </div>

          {subscription.loading ? <Card className={styles.emptyInline}><p>Abonelik seçenekleri yükleniyor…</p></Card> : subscription.error ? <Card className={styles.emptyInline}><p>Abonelik seçenekleri şu anda yüklenemedi. Lütfen sayfayı yeniden deneyin.</p></Card> : !subscription.entitlement ? <Card className={styles.emptyInline}><div><strong>Henüz aktif bir paketiniz yok.</strong><p>Dijital kartvizit veya NFC kart paketi seçerek hesabınızı etkinleştirebilirsiniz.</p></div><ButtonLink href="/urunler/nfc-kart" variant="primary">Paketleri İncele</ButtonLink></Card> : (
            <div className={styles.offerGrid}>
              {!hasPremium && <Card className={styles.offerCard}>
                <div className={styles.offerCopy}>
                  <span className={styles.sectionEyebrow}><Icon name="sparkles" /> PREMIUM</span>
                  <h3>Premium’a yükselt</h3>
                  <p>Mevcut hizmet süren korunur; 100 Network Mail kredisi ve Premium networking araçları bu döneme eklenir.</p>
                  <ul><li><Icon name="check" /> Mevcut hizmet süresi korunur</li><li><Icon name="check" /> 100 Network Mail kredisi eklenir</li><li><Icon name="check" /> Yeni fiziksel kart gönderilmez</li></ul>
                </div>
                <div className={styles.offerAction}>
                  <strong>{formatTryFromKurus(COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.priceKurus)}</strong>
                  <span>mevcut dönem</span>
                  <AddToCartButton
                    productId={NFC_PRODUCT.slug}
                    variantSku={COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.sku}
                    kind="NFC_PHYSICAL_CARD"
                    name="Premium yükseltme"
                    unitPriceKurus={COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_UPGRADE.priceKurus}
                    label="Premium’a yükselt"
                    className="ds-button ds-button--primary"
                  />
                </div>
              </Card>}

              {renewalWindowOpen && <Card className={styles.offerCard}>
                <div className={styles.offerCopy}>
                  <span className={styles.sectionEyebrow}><Icon name="refresh" /> YENİLEME</span>
                  <h3>{hasPremium ? "Premium hizmetini yenile" : "Hizmetini 1 yıl yenile"}</h3>
                  <p>Yenileme yalnızca dijital hizmet süresini uzatır; mevcut kartınız ve profil bağlantınız aynı kalır.</p>
                </div>
                <div className={styles.offerAction}>
                  <strong>{formatTryFromKurus(hasPremium ? COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.priceKurus : COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus)}</strong>
                  <span>1 yıl</span>
                  <AddToCartButton
                    productId={NFC_PRODUCT.slug}
                    variantSku={hasPremium ? COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.sku : COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.sku}
                    kind="NFC_PHYSICAL_CARD"
                    name={hasPremium ? "Premium hizmet yenileme" : "Yenomi ID hizmet yenileme"}
                    unitPriceKurus={hasPremium ? COMMERCIAL_PRICING.YENOMI_ID_PREMIUM_RENEWAL.priceKurus : COMMERCIAL_PRICING.YENOMI_ID_RENEWAL.priceKurus}
                    label="Hizmetimi Yenile"
                    className="ds-button ds-button--primary"
                  />
                </div>
              </Card>}

              {hasPremium && !renewalWindowOpen && <Card className={styles.emptyInline}><div><strong>Premium hizmetiniz aktif.</strong><p>Yenileme seçeneği, hizmetinizin bitimine 30 gün kala bu alanda açılır.</p></div></Card>}
            </div>
          )}
        </section>

        <section className={styles.ordersSection} id="orders" aria-labelledby="orders-title">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.sectionEyebrow}><Icon name="box" /> SİPARİŞLER & KART SÜRECİ</span>
              <h2 id="orders-title">Sipariş ve kargo takibi</h2>
              <p>Ödeme, baskı ve teslimat durumunuzu hesap ayarlarından ayrılmadan takip edin.</p>
            </div>
          </div>

          {ordersState.loading ? <Card className={styles.emptyInline}><p>Siparişleriniz yükleniyor…</p></Card> : ordersState.error ? <Card className={styles.emptyInline}><p>Sipariş bilgileri şu anda yüklenemedi. Lütfen sayfayı yeniden deneyin.</p></Card> : ordersState.orders.length === 0 ? <Card className={styles.emptyInline}><div><strong>Henüz siparişiniz yok.</strong><p>NFC + QR kart, dijital profil ve bir yıllık hizmeti tek pakette inceleyebilirsiniz.</p></div><ButtonLink href="/urunler/nfc-kart" variant="secondary">NFC Kartı İncele</ButtonLink></Card> : (
            <div className={styles.orderList}>
              {ordersState.orders.map((order) => {
                const info = ORDER_STATUS[order.status];
                const quantity = order.commerce_order_items.reduce((total, item) => total + item.quantity, 0);
                const unit = order.commerce_order_items.flatMap((item) => item.commerce_physical_card_units || [])[0];
                const canResumePayment = order.status === "DRAFT" || order.status === "AWAITING_PAYMENT";
                const presentation = orderPresentation(order);
                return <Card className={styles.orderCard} key={order.id}>
                  <div className={styles.orderHead}>
                    <div><span>Satın alma · {formatDateTime(order.paid_at || order.created_at)}</span><h3>{presentation.title}</h3><p>{presentation.description}</p></div>
                    <StatusBadge tone={info.tone} className={styles.orderStatus}>{info.label}</StatusBadge>
                  </div>
                  <p className={styles.orderDescription}>{info.description}</p>
                  {canResumePayment && <ResumePaymentButton orderId={order.id} />}
                  <div className={styles.orderFacts}>
                    <div><span>Toplam</span><strong>{formatTryFromKurus(order.total_kurus)}</strong></div>
                    <div><span>Adet</span><strong>{quantity}</strong></div>
                    <div><span>Ödeme zamanı</span><strong>{formatDateTime(order.paid_at)}</strong></div>
                  </div>
                  {unit && <OrderFulfillmentStepper order={order} unit={unit} />}
                </Card>;
              })}
            </div>
          )}
        </section>

        <div className={styles.grid}>
          <Card className={styles.accountCard}>
              <form onSubmit={saveAccount} noValidate>
                <div className={styles.cardHeader}>
                  <div>
                    <span className={styles.sectionEyebrow}><Icon name="id" /> HESAP BİLGİLERİ</span>
                    <h2>Profilini güncel tut</h2>
                    <p>Giriş ve hesap iletişim bilgilerinizi yönetin.</p>
                  </div>
                  {yenomiId ? <div className={styles.yenomiId} aria-label={`Yenomi ID: ${yenomiId}`}><span>YENOMI ID</span><strong>{yenomiId}</strong></div> : null}
                </div>
                <div className={styles.formGrid}>
                  <Field label="Ad Soyad">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      autoComplete="name"
                      enterKeyHint="next"
                    />
                  </Field>
                  <Field label="E-posta">
                    <Input
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      enterKeyHint="done"
                      required
                    />
                  </Field>
                </div>
                <Alert tone="info" title="E-posta değişikliği" className={styles.formAlert}>E-posta adresiniz değişirse, yeni adresinizi doğrulamanız istenir.</Alert>
                {accountMessage && <Alert tone={accountMessageTone} className={styles.formAlert}>{accountMessage}</Alert>}
                <div className={styles.actions}>
                  <Button type="submit" variant={accountDirty ? "primary" : "secondary-strong"} disabled={savingAccount || !accountDirty}>
                    {savingAccount ? "Kaydediliyor…" : "Hesap Bilgilerini Kaydet"}
                  </Button>
                </div>
              </form>
            </Card>

          <Card className={styles.sessionCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.sectionEyebrow}><Icon name="secure" /> OTURUM & CİHAZLAR</span>
                  <h2>Mevcut oturum</h2>
                  <p>Bu cihazdaki aktif Yenomi ID oturumunuz.</p>
                </div>
              </div>
              <div className={styles.sessionIdentity}>
                <span className={styles.sessionIcon}><Icon name="secure" /></span>
                <div><strong>{browserLabel}</strong><span>Bu cihazda giriş yapılmış durumda.</span></div>
              </div>
            <Button onClick={signOut} variant="ghost" className={styles.signOut}><Icon name="logout" /> Çıkış Yap</Button>
          </Card>

          <Card className={styles.securityCard}>
            <form onSubmit={savePassword}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.sectionEyebrow}><Icon name="lock" /> GÜVENLİK</span>
                  <h2>Şifreni güncelle</h2>
                  <p>Hesabınıza erişimi korumak için güçlü ve benzersiz bir şifre kullanın.</p>
                </div>
              </div>
              <div className={styles.securityForm}>
                <Field label="Yeni Şifre" help="En az 8 karakter">
                  <Input
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    enterKeyHint="done"
                    required
                  />
                </Field>
                <Button type="submit" variant={password.trim().length >= 8 ? "primary" : "secondary-strong"} disabled={savingPassword || password.trim().length < 8}>
                  {savingPassword ? "Güncelleniyor…" : "Şifreyi Güncelle"}
                </Button>
              </div>
              {securityMessage && <Alert tone={securityMessageTone} className={styles.formAlert}>{securityMessage}</Alert>}
            </form>
          </Card>

          <Card className={styles.legalCard}>
              <div className={styles.cardHeader}>
                <div>
                  <span className={styles.sectionEyebrow}><Icon name="shield" /> YASAL & GİZLİLİK</span>
                  <h2>Belgeler</h2>
                  <p>Hizmetiniz ve verilerinizle ilgili temel belgeler.</p>
                </div>
              </div>
              <nav className={styles.legalLinks} aria-label="Yasal belgeler">
                <Link href="/kvkk"><span><Icon name="id" /></span><div><strong>KVKK Aydınlatma Metni</strong><small>Kişisel verilerinizin işlenmesi</small></div><Icon name="chevronRight" /></Link>
                <Link href="/gizlilik"><span><Icon name="lock" /></span><div><strong>Gizlilik Politikası</strong><small>Veri ve gizlilik yaklaşımımız</small></div><Icon name="chevronRight" /></Link>
                <Link href="/iade-iptal"><span><Icon name="refresh" /></span><div><strong>İade ve İptal Koşulları</strong><small>Sipariş ve hizmet koşulları</small></div><Icon name="chevronRight" /></Link>
            </nav>
          </Card>
        </div>
      </div>
    </UserPanelShell>
  );
}
