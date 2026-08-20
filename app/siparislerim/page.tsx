"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import UserPanelShell from "../components/UserPanelShell";
import { Badge, ButtonLink, Card, EmptyState } from "../components/ui";
import { safeClientMessage } from "../../lib/errors";

type CommerceStatus = "DRAFT" | "AWAITING_PAYMENT" | "PAID" | "PREPARING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
type OrderItem = { id: string; product_name: string; product_kind: string; quantity: number; unit_price_kurus: number; configuration: Record<string, unknown> };
type CommerceOrder = {
  id: string; order_number: string; status: CommerceStatus; total_kurus: number; currency: string;
  paid_at: string | null; created_at: string; updated_at: string; tracking_company: string | null;
  tracking_number: string | null; shipped_at: string | null; delivered_at: string | null;
  commerce_order_items: OrderItem[]; shipping_addresses: { city: string; district: string }[] | { city: string; district: string } | null;
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

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) { setLoading(false); return; }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { setLoading(false); return; }
      setSignedIn(true);
      try {
        const response = await fetch("/api/commerce/orders", { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) setMessage(safeClientMessage(result, "Sipariş bilgileri şu anda yüklenemiyor. Lütfen yeniden dene."));
        else setOrders(result.orders ?? []);
      } catch {
        setMessage("Sunucuya ulaşılamadı. Bağlantını kontrol edip yeniden dene.");
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const activeCount = useMemo(() => orders.filter((order) => !["COMPLETED", "CANCELLED", "REFUNDED"].includes(order.status)).length, [orders]);

  if (loading) return <UserPanelShell activeKey="orders" title="Siparişlerim" description="Sipariş bilgileriniz yükleniyor."><Card><p className="p9-section-copy">Siparişler yükleniyor…</p></Card></UserPanelShell>;
  if (!signedIn) return <UserPanelShell activeKey="orders" title="Siparişlerim" description="Siparişlerinizi görüntülemek için hesabınıza giriş yapın."><EmptyState title="Oturum gerekli" description="Siparişleriniz hesabınıza bağlandığında burada görünür." action={<ButtonLink href="/giris?next=%2Fsiparislerim" variant="primary">Hesabına gir</ButtonLink>} /></UserPanelShell>;

  return <UserPanelShell activeKey="orders" eyebrow="HESAP" title="Siparişlerim" description={orders.length ? `${orders.length} sipariş · ${activeCount} devam eden süreç` : "Ürün, ödeme, hazırlık ve kargo durumunu tek yerden takip edin."} actions={[{href:"/urunler/nfc-kart",label:"NFC Kartı Satın Al",primary:true}]}>
    <section className="p9-stack">
      {message && <div className="p9-message" role="status">{message}</div>}
      <div className="p9-order-list">
        {orders.length === 0 ? <EmptyState title="İlk kartın henüz yok." description="NFC + QR kartını al; 1 yıl dijital hizmet ve Türkiye içi kargo dahil." action={<ButtonLink href="/urunler/nfc-kart" variant="primary">NFC Kartı Satın Al</ButtonLink>} /> : orders.map((order) => {
          const info = statusInfo[order.status];
          const address = Array.isArray(order.shipping_addresses) ? order.shipping_addresses[0] : order.shipping_addresses;
          const quantity = order.commerce_order_items.reduce((sum, item) => sum + item.quantity, 0);
          return <Card className="p9-order" data-tone={info.tone === "success" ? "success" : undefined} key={order.id}>
            <div className="p9-order__head"><div><span className="p9-order__date">{new Date(order.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}</span><h2 className="p9-order__number">{order.order_number}</h2><p className="p9-order__products">{order.commerce_order_items.map((item) => `${item.quantity} × ${item.product_name}`).join(" · ")}</p></div><Badge tone={info.tone}>{info.label}</Badge></div>
            {!(["CANCELLED", "REFUNDED"].includes(order.status)) && <div className="p9-order__progress" aria-label={`Sipariş durumu: ${info.label}`}>{[1,2,3,4,5].map((step) => <span key={step} data-active={info.step >= step ? "true" : "false"} />)}</div>}
            <p className="p9-order__status">{info.description}</p>
            <div className="p9-order__meta"><div><small>Toplam</small><strong>{(order.total_kurus / 100).toLocaleString("tr-TR")} TL</strong></div><div><small>Adet</small><strong>{quantity}</strong></div><div><small>Ödeme</small><strong>{order.paid_at ? new Date(order.paid_at).toLocaleDateString("tr-TR") : "Bekleniyor"}</strong></div><div><small>Teslimat</small><strong>{address ? `${address.district}, ${address.city}` : "—"}</strong></div></div>
            {order.status === "SHIPPED" && <div className="p9-order__shipping"><strong>Kargo</strong><span>{order.tracking_company || "Kargo firması"}{order.tracking_number ? ` · ${order.tracking_number}` : ""}</span></div>}
          </Card>;
        })}
      </div>
    </section>
  </UserPanelShell>;
}
