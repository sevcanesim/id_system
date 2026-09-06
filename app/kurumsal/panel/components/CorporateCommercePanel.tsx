"use client";

import { useEffect, useState } from "react";
import { Icon } from "../../../icons";
import { EmptyState, LoadingState } from "../../../components/ui/States";
import { formatTryFromKurus } from "../../../../lib/config/product";
import OrganizationNetworkMailPacks, { OrganizationCapacityPacks } from "./OrganizationNetworkMailPacks";
import styles from "./CorporateCommercePanel.module.css";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalKurus: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  items: Array<{ id: string; name: string; quantity: number; unitPriceKurus: number }>;
  invoice: { status: string; number: string | null; documentUrl: string | null; issuedAt: string | null } | null;
};

type Props = {
  organizationId: string;
  token: () => Promise<boolean>;
  purchaseAllowed: boolean;
};

const orderStatus: Record<string, string> = {
  AWAITING_PAYMENT: "Ödeme bekleniyor",
  PAID: "Ödendi",
  CANCELLED: "İptal edildi",
  REFUNDED: "İade edildi",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function CorporateCommercePanel({ organizationId, token, purchaseAllowed }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      const access = await token();
      if (!access) {
        if (!cancelled) {
          setError("Oturum doğrulanamadı.");
          setLoading(false);
        }
        return;
      }
      try {
        const response = await fetch(`/api/organizations/commerce?organizationId=${encodeURIComponent(organizationId)}`, {
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = await response.json() as { orders?: Order[]; error?: string };
        if (cancelled) return;
        if (!response.ok) {
          setError(payload.error || "Satın alma geçmişi yüklenemedi.");
          return;
        }
        setOrders(payload.orders || []);
      } catch {
        if (!cancelled) setError("Satın alma geçmişi yüklenemedi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [organizationId, token]);

  return (
    <section className={styles.panel} aria-labelledby="corporate-commerce-title">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}><Icon name="box" /> TİCARİ KAYITLAR</span>
          <h2 id="corporate-commerce-title">Abonelik ve satın alma geçmişi</h2>
          <p>Kurumsal siparişler, faturalar ve Network Mail kredi hareketleri yalnız Şirket Sahibi ile İK için görünür.</p>
        </div>
        <span className={styles.access}><Icon name="lock" /> Sınırlı erişim</span>
      </header>

      <OrganizationCapacityPacks organizationId={organizationId} purchaseAllowed={purchaseAllowed} />
      <OrganizationNetworkMailPacks organizationId={organizationId} purchaseAllowed={purchaseAllowed} />

      <section className={styles.history} aria-labelledby="corporate-order-history-title">
        <div className={styles.historyHeading}>
          <div>
            <span className={styles.eyebrow}>SİPARİŞ GEÇMİŞİ</span>
            <h3 id="corporate-order-history-title">Şirket hareketleri</h3>
          </div>
        </div>
        {loading ? <LoadingState label="Şirket satın alma geçmişi yükleniyor" variant="panel" /> : error ? (
          <p className={styles.error} role="status">{error}</p>
        ) : orders.length === 0 ? (
          <EmptyState compact icon="box" title="Henüz şirket satın alımı yok" description="Kurumsal paket ve kredi satın alımları bu alanda kalıcı olarak listelenir." />
        ) : (
          <div className={styles.orderList}>
            {orders.map((order) => (
              <article className={styles.order} key={order.id}>
                <div>
                  <span className={styles.orderNumber}>{order.orderNumber}</span>
                  <strong>{order.items.map((item) => `${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}`).join(" · ")}</strong>
                  <small>{formatDate(order.paidAt || order.createdAt)}</small>
                </div>
                <div className={styles.orderMeta}>
                  <span className={styles.status}>{orderStatus[order.status] || order.status}</span>
                  <strong>{formatTryFromKurus(order.totalKurus)}</strong>
                  {order.invoice?.documentUrl ? (
                    <a href={order.invoice.documentUrl} target="_blank" rel="noreferrer">Faturayı aç <Icon name="external" /></a>
                  ) : <small>{order.invoice?.status === "ISSUED" ? order.invoice.number || "Fatura hazır" : "Fatura hazırlanıyor"}</small>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
