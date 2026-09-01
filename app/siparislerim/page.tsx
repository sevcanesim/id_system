"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import UserPanelShell from "../components/UserPanelShell";
import { Badge, ButtonLink, Card, EmptyState } from "../components/ui";
import { safeClientMessage } from "../../lib/errors";
import styles from "./OrdersPage.module.css";

type CommerceStatus = "DRAFT" | "AWAITING_PAYMENT" | "PAID" | "PREPARING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
type OperationalStatus = "PROFILE_REQUIRED" | "PRINT_PENDING" | "SHIPPING_PENDING" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
type PhysicalUnit = {
  id: string;
  operational_status: OperationalStatus;
  print_requested_at: string | null;
  print_approved_at: string | null;
  shipping_pending_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
};
type OrderItem = {
  id: string;
  product_name: string;
  product_kind: string;
  quantity: number;
  unit_price_kurus: number;
  configuration: Record<string, unknown>;
  commerce_physical_card_units?: PhysicalUnit[];
};
type ShippingAddress = { city: string; district: string };
type CommerceOrder = {
  id: string;
  order_number: string;
  status: CommerceStatus;
  total_kurus: number;
  currency: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  tracking_company: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  commerce_order_items: OrderItem[];
  shipping_addresses: unknown;
};
type BadgeTone = "neutral" | "success" | "warning" | "error" | "info";

const statusInfo: Record<CommerceStatus, { label: string; description: string; step: number; tone: BadgeTone }> = {
  DRAFT: { label: "Taslak", description: "Sipariş henüz tamamlanmadı.", step: 0, tone: "neutral" },
  AWAITING_PAYMENT: { label: "Ödeme bekleniyor", description: "Ödeme tamamlandığında sipariş hazırlık sürecine alınır.", step: 1, tone: "warning" },
  PAID: { label: "Ödeme alındı", description: "Sipariş doğrulandı ve hazırlık sırasına alındı.", step: 2, tone: "info" },
  PREPARING: { label: "Hazırlanıyor", description: "Kart üretim ve kalite kontrol aşamasında.", step: 3, tone: "info" },
  SHIPPED: { label: "Kargolandı", description: "Sipariş teslimat adresine doğru yola çıktı.", step: 4, tone: "info" },
  COMPLETED: { label: "Teslim edildi", description: "Sipariş süreci tamamlandı.", step: 5, tone: "success" },
  CANCELLED: { label: "İptal edildi", description: "Sipariş iptal edildi.", step: 0, tone: "error" },
  REFUNDED: { label: "İade edildi", description: "Ödeme iade edildi ve ilgili dijital hizmet durduruldu.", step: 0, tone: "error" },
};

const operationLabel: Record<OperationalStatus, string> = {
  PROFILE_REQUIRED: "Profil bilgileri bekleniyor",
  PRINT_PENDING: "Dijital Kart Basımı Gerçekleştirilmeli",
  SHIPPING_PENDING: "Kargo İşlemi Bekleniyor",
  IN_TRANSIT: "Kargoya Verildi",
  OUT_FOR_DELIVERY: "Dağıtımda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

function isShippingAddress(value: unknown): value is ShippingAddress {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.city === "string" && typeof candidate.district === "string";
}
function normalizeShippingAddress(value: unknown): ShippingAddress | null {
  if (Array.isArray(value)) return value.find(isShippingAddress) ?? null;
  return isShippingAddress(value) ? value : null;
}
function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
function operationStep(status: OperationalStatus) {
  if (["PROFILE_REQUIRED", "PRINT_PENDING", "SHIPPING_PENDING"].includes(status)) return 0;
  if (status === "IN_TRANSIT") return 1;
  if (status === "OUT_FOR_DELIVERY") return 2;
  if (status === "DELIVERED") return 3;
  return 0;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setLoading(false); return; }
      setSignedIn(true);
      try {
        const response = await fetch("/api/commerce/orders", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok) setMessage(safeClientMessage(result, "Sipariş bilgileri şu anda yüklenemiyor. Lütfen yeniden dene."));
        else setOrders(result.orders ?? []);
      } catch {
        if (!cancelled) setMessage("Sunucuya ulaşılamadı. Bağlantını kontrol edip yeniden dene.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeCount = useMemo(() => orders.filter((order) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(order.status)).length, [orders]);

  if (loading) return <UserPanelShell activeKey="orders" title="Siparişlerim & Kart Süreci" description="Sipariş ve kargo bilgilerin yükleniyor."><Card><p>Siparişler yükleniyor…</p></Card></UserPanelShell>;
  if (!signedIn) return <UserPanelShell activeKey="orders" title="Siparişlerim & Kart Süreci" description="Siparişlerini görüntülemek için hesabına giriş yap."><EmptyState title="Oturum gerekli" description="Siparişlerin hesabına bağlandığında burada görünür." action={<ButtonLink href="/giris?next=%2Fsiparislerim">Hesabına gir</ButtonLink>} /></UserPanelShell>;

  return (
    <UserPanelShell activeKey="orders" eyebrow="HESAP" title="Siparişlerim & Kart Süreci" description={orders.length ? `${orders.length} sipariş · ${activeCount} devam eden süreç` : "Satın alma, baskı ve kargo sürecini tek yerden takip et."}>
      <section className={styles.page}>
        {message && <div className={styles.message} role="status">{message}</div>}
        <div className={styles.list}>
          {orders.length === 0 ? <EmptyState title="İlk kartın henüz yok." description="NFC + QR kartını al; 1 yıl dijital hizmet ve Türkiye içi kargo dahil." action={<ButtonLink href="/urunler/nfc-kart">NFC Kartı Satın Al</ButtonLink>} /> : orders.map((order) => {
            const info = statusInfo[order.status];
            const address = normalizeShippingAddress(order.shipping_addresses);
            const quantity = order.commerce_order_items.reduce((sum, item) => sum + item.quantity, 0);
            const unit = order.commerce_order_items.flatMap((item) => item.commerce_physical_card_units ?? [])[0];
            const currentStep = unit ? operationStep(unit.operational_status) : 0;
            return (
              <Card className={styles.order} key={order.id}>
                <div className={styles.head}>
                  <div><span className={styles.date}>Satın alma · {formatDateTime(order.paid_at || order.created_at)}</span><h2 className={styles.number}>{order.order_number}</h2><p className={styles.products}>{order.commerce_order_items.map((item) => `${item.quantity} × ${item.product_name}`).join(" · ")}</p></div>
                  <Badge tone={info.tone}>{info.label}</Badge>
                </div>
                <div className={styles.progress} aria-label={`Sipariş durumu: ${info.label}`}>{[1,2,3,4,5].map((step) => <span key={step} data-active={info.step >= step ? "true" : "false"} />)}</div>
                <p className={styles.statusCopy}>{info.description}</p>
                <div className={styles.meta}>
                  <div><small>Toplam</small><strong>{(order.total_kurus / 100).toLocaleString("tr-TR")} TL</strong></div>
                  <div><small>Adet</small><strong>{quantity}</strong></div>
                  <div><small>Ödeme zamanı</small><strong>{formatDateTime(order.paid_at)}</strong></div>
                  <div><small>Teslimat</small><strong>{address ? `${address.district}, ${address.city}` : "—"}</strong></div>
                </div>
                {unit && (
                  <div className={styles.cardJourney}>
                    <div className={styles.journeyHeader}><div><h3>Fiziksel kart & kargo</h3><span>{operationLabel[unit.operational_status]}</span></div>{unit.tracking_number && <span>{unit.carrier || "Kargo"} · {unit.tracking_number}</span>}</div>
                    <div className={styles.steps}>
                      {[{ title: "Hazırlanıyor", detail: unit.operational_status === "PRINT_PENDING" ? "Baskı onayı bekleniyor" : unit.operational_status === "SHIPPING_PENDING" ? "Kargo işlemi bekleniyor" : formatDateTime(unit.print_requested_at) }, { title: "Kargoya Verildi", detail: unit.shipped_at ? formatDateTime(unit.shipped_at) : "Bekleniyor" }, { title: "Dağıtımda", detail: unit.out_for_delivery_at ? formatDateTime(unit.out_for_delivery_at) : "Bekleniyor" }, { title: "Teslim Edildi", detail: unit.delivered_at ? formatDateTime(unit.delivered_at) : "Bekleniyor" }].map((step, index) => <div className={`${styles.step} ${index <= currentStep ? styles.stepActive : ""}`} key={step.title}><small>0{index + 1}</small><strong>{step.title}</strong><span>{step.detail}</span></div>)}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </UserPanelShell>
  );
}
