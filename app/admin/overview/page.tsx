"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { type Order, money, orderOperationsState, needsPhysicalFulfillment } from "../../../lib/admin/order-classification";
import { YenomiProductVisual } from "../../ui/YenomiProductVisual";
import { LoadingState } from "../../components/ui/States";
import styles from "./AdminOverview.module.css";

type OperationsSummary = {
  printQueue: { operations_status: string }[];
  premiumUsers: unknown[];
  renewalNotices: { status: string }[];
};

const emptyOperations: OperationsSummary = { printQueue: [], premiumUsers: [], renewalNotices: [] };

const QUICK_LINKS = [
  { href: "/admin", label: "Satış Kuyruğu", hint: "Bireysel + kurumsal siparişler, aksiyon sırasına göre" },
  { href: "/admin", label: "Ödeme Mutabakatı", hint: "Ödeme → sipariş → entitlement eşleşme sorunları" },
  { href: "/admin", label: "Kurumsal Hesaplar", hint: "Organizations: şirket oluşturma, yönetici bağlama" },
  { href: "/admin/operations", label: "Baskı & Kargo", hint: "Print Queue / Shipping — fiziksel kart üretim hattı" },
  { href: "/admin/operations", label: "Network Mail", hint: "Bireysel Premium kota yönetimi" },
  { href: "/admin/operations", label: "Lisans Batchleri", hint: "Kurumsal kapasite yenileme kuyruğu" },
  { href: "/admin/operations", label: "Fiyatlandırma", hint: "Ürün / paket fiyat kataloğu" },
  { href: "/admin/operations", label: "Audit Log", hint: "Tüm admin mutasyonlarının denetim kaydı" },
  { href: "/admin/access", label: "Kullanıcılar", hint: "Super Admin erişimi olan operatörler" },
];

export default function AdminOverviewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [operations, setOperations] = useState<OperationsSummary>(emptyOperations);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");
    const [ordersResult, operationsResult] = await Promise.allSettled([
      fetch("/api/admin/commerce/orders", { credentials: "same-origin", cache: "no-store" }),
      fetch("/api/admin/operations", { credentials: "same-origin", cache: "no-store" }),
    ]);

    if (ordersResult.status === "fulfilled") {
      const response = ordersResult.value;
      if (response.status === 403) setAuthorized(false);
      else if (response.ok) setOrders((await response.json()).orders ?? []);
      else setMessage("Sipariş özeti yüklenemedi.");
    } else setMessage("Sipariş özeti için sunucuya ulaşılamadı.");

    if (operationsResult.status === "fulfilled") {
      const response = operationsResult.value;
      if (response.status === 403) setAuthorized(false);
      else if (response.ok) setOperations(await response.json());
      else setOperations(emptyOperations);
    } else setOperations(emptyOperations);

    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    attention: orders.filter((order) => ["PAYMENT_PENDING", "ACTIVATION_PENDING", "FULFILLMENT", "SHIPPING", "ISSUE"].includes(orderOperationsState(order))).length,
    activation: orders.filter((order) => orderOperationsState(order) === "ACTIVATION_PENDING").length,
    fulfillment: orders.filter((order) => ["FULFILLMENT", "SHIPPING"].includes(orderOperationsState(order)) && needsPhysicalFulfillment(order)).length,
    revenue: orders.filter((order) => !["CANCELLED", "REFUNDED"].includes(order.status)).reduce((sum, order) => sum + order.total_kurus, 0),
    print: operations.printQueue.filter((unit) => ["PRINT_PENDING", "PRINTING"].includes(unit.operations_status)).length,
    shipping: operations.printQueue.filter((unit) => ["SHIPPING_PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(unit.operations_status)).length,
    premium: operations.premiumUsers.length,
    renewals: operations.renewalNotices.filter((notice) => !["PAID", "CANCELLED"].includes(notice.status)).length,
  }), [orders, operations]);

  if (loading) return <main id="main-content" className={styles.page}><section className={styles.shell}><LoadingState variant="panel" label="Platform özeti hazırlanıyor" hint="Siparişler ve operasyon verileri birleştiriliyor." /></section></main>;
  if (!authorized) return <main id="main-content" className={styles.page}><section className={styles.shell}><div className={styles.message}>Bu alan yalnız Super Admin kullanıcılarına açıktır. <Link href="/giris">Giriş yap</Link></div></section></main>;

  return <main id="main-content" className={styles.page}><section className={styles.shell}>
    <div className={styles.heading}>
      <div className={styles.headingCopy}><span className={styles.kicker}>PLATFORM GENEL BAKIŞ</span><h1>Tüm operasyon alanlarının tek ekranda özeti.</h1><p>Her rakam kendi domain sayfasına bağlıdır; aksiyon burada değil, ilgili sekmede alınır.</p></div>
      <div className={styles.headingActions}>
        <div className={styles.headingVisual}><YenomiProductVisual variant="dashboard" compact /></div>
        <button type="button" className={styles.button} onClick={() => void load()}>Veriyi yenile</button>
      </div>
    </div>
    {message && <div className={styles.message} role="status">{message}</div>}
    <div className={styles.stats}>
      <Link href="/admin" className={styles.stat}><small>Aksiyon bekleyen sipariş</small><strong>{stats.attention}</strong></Link>
      <Link href="/admin" className={styles.stat}><small>Aktivasyon bekleyen</small><strong>{stats.activation}</strong></Link>
      <Link href="/admin/operations" className={styles.stat}><small>Baskı kuyruğu</small><strong>{stats.print}</strong></Link>
      <Link href="/admin/operations" className={styles.stat}><small>Kargo süreci</small><strong>{stats.shipping}</strong></Link>
      <Link href="/admin/operations" className={styles.stat}><small>Premium kullanıcı</small><strong>{stats.premium}</strong></Link>
      <Link href="/admin/operations" className={styles.stat}><small>Açık yenileme</small><strong>{stats.renewals}</strong></Link>
      <Link href="/admin" className={styles.stat}><small>Fiziksel fulfillment</small><strong>{stats.fulfillment}</strong></Link>
      <div className={styles.stat}><small>Net sipariş tutarı</small><strong>{money(stats.revenue)}</strong></div>
    </div>
    <div className={styles.linkGrid}>
      {QUICK_LINKS.map((link) => <Link key={link.label} href={link.href} className={styles.linkCard}><strong>{link.label}</strong><span>{link.hint}</span></Link>)}
    </div>
  </section></main>;
}
