"use client";

import { useEffect, useId, useRef } from "react";
import {
  type Order, type Status,
  labels, orderStatusLabels, productLabels,
  formatDate, money, itemSku, classifyProduct, orderAudience, needsPhysicalFulfillment, attentionLabel,
} from "../../../lib/admin/order-classification";
import styles from "../AdminSales.module.css";

/**
 * Sipariş detay çekmecesi. app/admin/page.tsx'ten çıkarıldı; davranış
 * birebir korunur. Parent'ta tutulur (state: selectedOrderId/tracking/
 * saving) çünkü sekme değişse de açık kalabilir — tab'a özel değildir.
 */
export default function OrderDetailDrawer({
  order, tracking, setTracking, saving, onClose, onUpdateOrder, onResendActivation,
}: {
  order: Order;
  tracking: Record<string, { company: string; number: string }>;
  setTracking: (updater: (current: Record<string, { company: string; number: string }>) => Record<string, { company: string; number: string }>) => void;
  saving: string | null;
  onClose: () => void;
  onUpdateOrder: (orderId: string, status: Status) => void;
  onResendActivation: (orderId: string) => void;
}) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return <>
    <button type="button" aria-label="Sipariş detayını kapat" className={styles.drawerBackdrop} onClick={onClose} />
    <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.drawerHead}><div><span className={styles.kicker}>{orderAudience(order) === "CORPORATE" ? "KURUMSAL SATIŞ" : "BİREYSEL SATIŞ"}</span><h2 id={titleId}>{order.order_number}</h2><div className={styles.subtle}>{formatDate(order.created_at)}</div></div><button ref={closeButtonRef} type="button" className={styles.iconButton} onClick={onClose} aria-label="Sipariş detayını kapat">×</button></div>
      <div className={styles.drawerBody}>
        <div className={styles.detailGrid}><div className={styles.detail}><small>Müşteri</small><strong>{order.customer_name || "—"}</strong><span className={styles.subtle}>{order.guest_email}</span></div><div className={styles.detail}><small>Tutar</small><strong>{money(order.total_kurus)}</strong><span className={styles.subtle}>{order.paid_at ? `Ödeme ${formatDate(order.paid_at)}` : "Ödeme bekleniyor"}</span></div><div className={styles.detail}><small>Hesap</small><strong>{order.activation_claimed_at ? "Aktif" : order.paid_at ? "Aktivasyon bekliyor" : "Ödeme bekliyor"}</strong></div><div className={styles.detail}><small>Fulfillment</small><strong>{needsPhysicalFulfillment(order) ? attentionLabel(order) : "Dijital ürün"}</strong></div></div>
        <section className={styles.section}><h3>Satın alınan ürünler</h3>{order.commerce_order_items.map((item) => <div className={styles.compactRow} key={item.id}><strong>{item.quantity} × {item.product_name}</strong><span className={styles.subtle}>{productLabels[classifyProduct(item)]}{itemSku(item) ? ` · ${itemSku(item)}` : ""}</span></div>)}</section>
        {orderAudience(order) === "CORPORATE" && <section className={styles.section}><h3>Şirket / fatura</h3><div className={styles.detailGrid}><div className={styles.detail}><small>Şirket</small><strong>{order.company_name || "—"}</strong></div><div className={styles.detail}><small>Vergi</small><strong>{order.tax_number || "—"}</strong><span className={styles.subtle}>{order.tax_office || "Vergi dairesi yok"}</span></div></div></section>}
        <section className={styles.section}><h3>Operasyon aksiyonları</h3><div className={styles.actions}>{order.status === "PAID" && needsPhysicalFulfillment(order) && <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => onUpdateOrder(order.id, "PREPARING")} disabled={saving === order.id}>Hazırlamaya al</button>}{order.status === "PAID" && !order.activation_claimed_at && <button className={styles.button} onClick={() => onResendActivation(order.id)} disabled={saving === order.id}>Aktivasyonu yeniden gönder</button>}{order.status === "PREPARING" && needsPhysicalFulfillment(order) && <><label className={styles.field}><span>Kargo firması</span><input value={tracking[order.id]?.company ?? ""} onChange={(e) => setTracking((c) => ({ ...c, [order.id]: { company: e.target.value, number: c[order.id]?.number ?? "" } }))} /></label><label className={styles.field}><span>Takip numarası</span><input value={tracking[order.id]?.number ?? ""} onChange={(e) => setTracking((c) => ({ ...c, [order.id]: { company: c[order.id]?.company ?? "", number: e.target.value } }))} /></label><button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => onUpdateOrder(order.id, "SHIPPED")} disabled={saving === order.id}>Kargoya ver</button></>}{order.status === "SHIPPED" && <button className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => onUpdateOrder(order.id, "COMPLETED")} disabled={saving === order.id}>Teslim edildi</button>}</div></section>
        <section className={styles.section}><h3>Sipariş durumu</h3><label className={styles.field}><span>Yönetim durumu</span><select value={order.status} onChange={(e) => { const value = e.target.value as Status; if (value in labels) onUpdateOrder(order.id, value); }} disabled={saving === order.id || ["DRAFT","AWAITING_PAYMENT"].includes(order.status)}>{!(order.status in labels) && <option value={order.status}>{orderStatusLabels[order.status]}</option>}{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></section>
      </div>
    </aside>
  </>;
}
