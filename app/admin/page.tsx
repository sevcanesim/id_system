"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { networkMailGrant } from "../../lib/commerce/packages";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import AppHeader from "../components/AppHeader";
import { EmptyState, LoadingState } from "../components/ui/States";

type Status = "PAID" | "PREPARING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
type ShippingAddress = { recipient_name: string; phone: string; address_line: string; district: string; city: string; postal_code: string | null; delivery_note: string | null };

type Order = {
  id: string; order_number: string; customer_name: string | null; customer_phone: string | null; guest_email: string;
  status: Status | "DRAFT" | "AWAITING_PAYMENT"; total_kurus: number; paid_at: string | null; created_at: string;
  tracking_company: string | null; tracking_number: string | null; activation_claimed_at: string | null;
  commerce_order_items: { id: string; product_name: string; product_kind: string; quantity: number }[];
  shipping_addresses: ShippingAddress[] | ShippingAddress | null;
};

type BusinessPlan = { code: string; name: string; seat_limit: number | null; annual_price_kurus: number | null; monthly_price_kurus: number | null; is_active: boolean };

type ReconciliationIssue = {
  id: string; order_id: string; order_item_id: string | null; issue_code: string; details: Record<string, unknown>; resolved_at: string | null; resolution_note: string | null; created_at: string;
};
type ReconciliationRow = {
  id: string; order_number: string; status: string; total_kurus: number; currency: string; guest_email: string; paid_at: string | null; created_at: string; activation_claimed_at: string | null; user_id: string | null; openIssueCount: number; flags: string[]; requiresReview: boolean;
  paymentAttempts: { id: string; status: string; provider_payment_id: string | null; error_code: string | null; error_message: string | null; updated_at: string }[];
  fulfillmentIssues: ReconciliationIssue[];
};
type ReconciliationSummary = { checkedOrders: number; requiresReview: number; openFulfillmentIssues: number; orphanPaidAttempts: number };

type CorporateAccount = {
  id: string; name: string; slug: string; status: string; createdAt: string;
  corporateId: string | null; taxNumber: string | null;
  subscription: { id: string; status: string; seat_limit: number; starts_at: string | null; expires_at: string | null; billing_period: "MONTHLY" | "YEARLY"; business_plans: { code: string; name: string } | null } | null;
  entitlements: { employee_limit: number; digital_card_limit: number; physical_card_limit: number; mail_credit_limit: number; mail_credits_remaining: number } | null;
  usedSeats: number;
  memberCount: number;
  managers: { id: string; role: string; status: string; email: string }[];
};

const labels: Record<Status, string> = { PAID: "Ödeme alındı", PREPARING: "Hazırlanıyor", SHIPPED: "Kargolandı", COMPLETED: "Tamamlandı", CANCELLED: "İptal", REFUNDED: "İade" };

export default function AdminPage() {
  const [tab, setTab] = useState<"orders" | "reconciliation" | "corporate">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Order["status"]>("ALL");
  const [search, setSearch] = useState("");
  const [tracking, setTracking] = useState<Record<string, { company: string; number: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [reconciliationRows, setReconciliationRows] = useState<ReconciliationRow[]>([]);
  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary>({ checkedOrders: 0, requiresReview: 0, openFulfillmentIssues: 0, orphanPaidAttempts: 0 });
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [reconciliationMessage, setReconciliationMessage] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [resolvingIssue, setResolvingIssue] = useState<string | null>(null);
  const [retrievingOrderId, setRetrievingOrderId] = useState<string | null>(null);
  const [reconcilingPaid, setReconcilingPaid] = useState(false);

  const [accounts, setAccounts] = useState<CorporateAccount[]>([]);
  const [plans, setPlans] = useState<BusinessPlan[]>([]);
  const [corporateLoading, setCorporateLoading] = useState(false);
  const [corporateMessage, setCorporateMessage] = useState("");
  const [provisioning, setProvisioning] = useState(false);
  const [form, setForm] = useState({ name: "", taxNumber: "", taxOffice: "", legalAddress: "", city: "", planCode: "CORP-10", employeeLimit: "", digitalCardLimit: "", physicalCardLimit: "", mailCreditLimit: "", billingPeriod: "YEARLY" as "MONTHLY" | "YEARLY", termDays: "", status: "ACTIVE" as "ACTIVE" | "SUSPENDED" });
  const [attachForm, setAttachForm] = useState<Record<string, { email: string; fullName: string; role: "OWNER" | "ADMIN" | "HR" }>>({});

  async function getToken() {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase?.auth.getSession() ?? { data: { session: null } };
    return data.session?.access_token ?? null;
  }

  async function load() {
    const token = await getToken();
    if (!token) { setAuthorized(false); setLoading(false); return; }
    try {
      const response = await fetch("/api/admin/commerce/orders", { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (response.status === 403) setAuthorized(false);
      else if (!response.ok) setMessage(result.error ?? "Siparişler yüklenemedi.");
      else {
        setOrders(result.orders ?? []);
        setTracking(Object.fromEntries((result.orders ?? []).map((order: Order) => [order.id, { company: order.tracking_company ?? "", number: order.tracking_number ?? "" }])));
      }
    } catch { setMessage("Sunucuya ulaşılamadı."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function loadCorporate() {
    const token = await getToken();
    if (!token) return;
    setCorporateLoading(true);
    try {
      const response = await fetch("/api/admin/organizations", { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) setCorporateMessage(result.error ?? "Kurumsal hesaplar yüklenemedi.");
      else { setAccounts(result.accounts ?? []); setPlans(result.plans ?? []); }
    } catch { setCorporateMessage("Sunucuya ulaşılamadı."); }
    finally { setCorporateLoading(false); }
  }

  useEffect(() => { if (tab === "corporate" && accounts.length === 0 && !corporateLoading) void loadCorporate(); }, [tab]);

  async function loadReconciliation() {
    const token = await getToken();
    if (!token) return;
    setReconciliationLoading(true);
    setReconciliationMessage("");
    try {
      const response = await fetch("/api/admin/commerce/reconciliation", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) setReconciliationMessage(result.error ?? "Ödeme mutabakatı yüklenemedi.");
      else {
        setReconciliationRows(result.rows ?? []);
        setReconciliationSummary(result.summary ?? { checkedOrders: 0, requiresReview: 0, openFulfillmentIssues: 0, orphanPaidAttempts: 0 });
      }
    } catch { setReconciliationMessage("Ödeme mutabakatı için sunucuya ulaşılamadı."); }
    finally { setReconciliationLoading(false); }
  }

  useEffect(() => { if (tab === "reconciliation" && reconciliationRows.length === 0 && !reconciliationLoading) void loadReconciliation(); }, [tab]);

  async function resolveReconciliationIssue(issueId: string) {
    const note = (resolutionNotes[issueId] ?? "").trim();
    if (note.length < 8) { setReconciliationMessage("Çözüm notu en az 8 karakter olmalı."); return; }
    const token = await getToken(); if (!token) return;
    setResolvingIssue(issueId); setReconciliationMessage("");
    try {
      const response = await fetch("/api/admin/commerce/reconciliation", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ issueId, resolutionNote: note }) });
      const result = await response.json();
      if (!response.ok) setReconciliationMessage(result.error ?? "Mutabakat kaydı çözümlenemedi.");
      else { setReconciliationMessage("Mutabakat kaydı çözümlendi ve denetim günlüğüne işlendi."); await loadReconciliation(); }
    } catch { setReconciliationMessage("Mutabakat kaydı güncellenirken sunucuya ulaşılamadı."); }
    finally { setResolvingIssue(null); }
  }

  async function retrieveIyzico(orderId: string) {
    const token = await getToken(); if (!token) return;
    setRetrievingOrderId(orderId); setReconciliationMessage("");
    try {
      const response = await fetch("/api/admin/commerce/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "retrieve_iyzico", orderId }),
      });
      const result = await response.json();
      if (!response.ok) setReconciliationMessage(result.error ?? "iyzico çekimi tamamlanamadı.");
      else if (result.paid) { setReconciliationMessage("iyzico ödemesi doğrulandı ve sipariş işlendi."); await loadReconciliation(); }
      else if (result.pending) setReconciliationMessage("iyzico henüz kesin sonuç vermedi. Deneme PENDING bırakıldı.");
      else { setReconciliationMessage("iyzico ödemeyi onaylamadı."); await loadReconciliation(); }
    } catch { setReconciliationMessage("iyzico çekimi sırasında sunucuya ulaşılamadı."); }
    finally { setRetrievingOrderId(null); }
  }

  async function runPaidReconciliation() {
    const token = await getToken(); if (!token) return;
    setReconcilingPaid(true); setReconciliationMessage("");
    try {
      const response = await fetch("/api/admin/commerce/reconciliation", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) setReconciliationMessage(result.error ?? "Ödenmiş sipariş onarımı çalıştırılamadı.");
      else { setReconciliationMessage("Kayıtlı PAID siparişler onarıldı."); await loadReconciliation(); }
    } catch { setReconciliationMessage("Ödenmiş sipariş onarımı için sunucuya ulaşılamadı."); }
    finally { setReconcilingPaid(false); }
  }

  async function provisionOrganization(event: FormEvent) {
    event.preventDefault();
    const token = await getToken(); if (!token) return;
    setProvisioning(true); setCorporateMessage("");
    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "create_tenant",
          name: form.name,
          taxNumber: form.taxNumber,
          taxOffice: form.taxOffice,
          legalAddress: form.legalAddress,
          city: form.city,
          planCode: form.planCode,
          employeeLimit: form.employeeLimit ? Number(form.employeeLimit) : undefined,
          digitalCardLimit: form.digitalCardLimit ? Number(form.digitalCardLimit) : undefined,
          physicalCardLimit: form.physicalCardLimit ? Number(form.physicalCardLimit) : undefined,
          mailCreditLimit: form.mailCreditLimit ? Number(form.mailCreditLimit) : undefined,
          billingPeriod: form.billingPeriod,
          termDays: form.termDays ? Number(form.termDays) : undefined,
          status: form.status,
        }),
      });
      const result = await response.json();
      if (!response.ok) { setCorporateMessage(result.error ?? "Şirket oluşturulamadı."); return; }
      setCorporateMessage(`${result.organization.name} oluşturuldu. Corporate ID: ${result.organization.corporate_id || "atanacak"}. Kullanıcılar ayrıca bağlanır.`);
      setForm({ name: "", taxNumber: "", taxOffice: "", legalAddress: "", city: "", planCode: "CORP-10", employeeLimit: "", digitalCardLimit: "", physicalCardLimit: "", mailCreditLimit: "", billingPeriod: "YEARLY", termDays: "", status: "ACTIVE" });
      await loadCorporate();
    } catch { setCorporateMessage("Sunucuya ulaşılamadı."); }
    finally { setProvisioning(false); }
  }

  async function attachManager(organizationId: string) {
    const fields = attachForm[organizationId];
    if (!fields?.email || !fields.fullName) { setCorporateMessage("Yönetici e-postası ve adı gerekli."); return; }
    const token = await getToken(); if (!token) return;
    setProvisioning(true); setCorporateMessage("");
    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "attach_manager", organizationId, email: fields.email, fullName: fields.fullName, role: fields.role || "OWNER" }),
      });
      const result = await response.json();
      if (!response.ok) { setCorporateMessage(result.error ?? "Yönetici bağlanamadı."); return; }
      setCorporateMessage(result.existingUser ? `${fields.email} mevcut kullanıcı olarak bağlandı.` : (result.emailSent ? `${fields.email} adresine davet gönderildi.` : `${fields.email} davet edildi ama e-posta gönderilemedi.`));
      setAttachForm((current) => ({ ...current, [organizationId]: { email: "", fullName: "", role: "OWNER" } }));
      await loadCorporate();
    } catch { setCorporateMessage("Sunucuya ulaşılamadı."); }
    finally { setProvisioning(false); }
  }

  async function setOrganizationStatus(organizationId: string, status: "ACTIVE" | "SUSPENDED") {
    const token = await getToken(); if (!token) return;
    const response = await fetch("/api/admin/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ organizationId, status }),
    });
    const result = await response.json();
    if (!response.ok) setCorporateMessage(result.error ?? "Durum güncellenemedi.");
    else await loadCorporate();
  }

  const selectedPlan = plans.find((plan) => plan.code === form.planCode);


  async function resendActivation(orderId: string) {
    const token = await getToken(); if (!token) return;
    setSaving(orderId); setMessage("");
    try {
      const response = await fetch("/api/admin/commerce/orders", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId, action: "RESEND_ACTIVATION" }) });
      const result = await response.json();
      setMessage(response.ok ? (result.message ?? "Aktivasyon bağlantısı yeniden gönderildi.") : (result.error ?? "Aktivasyon bağlantısı gönderilemedi."));
    } catch { setMessage("Aktivasyon gönderilirken sunucuya ulaşılamadı."); }
    finally { setSaving(null); }
  }

  async function updateOrder(orderId: string, status: Status) {
    const token = await getToken(); if (!token) return;
    setSaving(orderId); setMessage("");
    const t = tracking[orderId] ?? { company: "", number: "" };
    try {
      const response = await fetch("/api/admin/commerce/orders", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId, action: "UPDATE_ORDER", status, trackingCompany: t.company || null, trackingNumber: t.number || null }) });
      const result = await response.json();
      if (!response.ok) setMessage(result.error ?? "Sipariş güncellenemedi.");
      else setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status, tracking_company: t.company || null, tracking_number: t.number || null } : order));
    } catch { setMessage("Güncelleme sırasında sunucuya ulaşılamadı."); }
    finally { setSaving(null); }
  }

  const stats = useMemo(() => ({
    total: orders.length,
    paid: orders.filter((o) => o.status === "PAID").length,
    preparing: orders.filter((o) => o.status === "PREPARING").length,
    revenue: orders.filter((o) => !["CANCELLED", "REFUNDED"].includes(o.status)).reduce((sum, o) => sum + o.total_kurus, 0),
  }), [orders]);
  const visible = orders.filter((order) => {
    if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
    const needle = search.trim().toLocaleLowerCase("tr-TR");
    if (!needle) return true;
    const address = Array.isArray(order.shipping_addresses) ? order.shipping_addresses[0] : order.shipping_addresses;
    return [order.order_number, order.customer_name, order.customer_phone, order.guest_email, address?.recipient_name, address?.phone, address?.city, address?.district]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("tr-TR").includes(needle));
  });

  if (loading) return <main className="admin-page"><AppHeader context="Yönetim Paneli" /><div className="result-empty"><h1>Siparişler yükleniyor.</h1></div></main>;
  if (!authorized) return <main className="admin-page"><AppHeader context="Yönetim Paneli" /><div className="result-empty"><h1>Bu alan yalnız yöneticilere açıktır.</h1><Link href="/giris">Giriş Yap</Link></div></main>;

  return <main id="main-content" className="admin-page"><AppHeader context="Yönetim Paneli" actions={[{ href: "/kurumsal", label: "Kurumsal" }, { href: "/urunler", label: "Ürünler", primary: true }]} />
    <section className="admin-shell">
      <div className="admin-heading"><span className="section-kicker">SATIŞ VE OPERASYON</span><h1>Siparişi ödemeden teslimata kadar yönet.</h1><p>Yeni commerce siparişleri, üretim ve kargo bilgileri aynı kuyrukta.</p></div>
      <div className="admin-tabs" role="tablist"><button type="button" role="tab" aria-selected={tab === "orders"} className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Siparişler</button><button type="button" role="tab" aria-selected={tab === "reconciliation"} className={tab === "reconciliation" ? "active" : ""} onClick={() => setTab("reconciliation")}>Ödeme Mutabakatı</button><button type="button" role="tab" aria-selected={tab === "corporate"} className={tab === "corporate" ? "active" : ""} onClick={() => setTab("corporate")}>Kurumsal Hesaplar</button></div>
      {tab === "orders" && <>
      <div className="admin-stats"><article><small>Toplam</small><b>{stats.total}</b></article><article><small>Yeni ödenmiş</small><b>{stats.paid}</b></article><article><small>Hazırlanıyor</small><b>{stats.preparing}</b></article><article><small>Net sipariş tutarı</small><b>{(stats.revenue / 100).toLocaleString("tr-TR")} TL</b></article></div>
      <div className="admin-filter"><label className="admin-search-label">Ara<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sipariş no, müşteri, telefon veya e-posta" /></label><label>Durum<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}><option value="ALL">Tümü</option><option value="PAID">Ödeme alındı</option><option value="PREPARING">Hazırlanıyor</option><option value="SHIPPED">Kargolandı</option><option value="COMPLETED">Tamamlandı</option><option value="CANCELLED">İptal</option><option value="REFUNDED">İade</option></select></label></div>
      {message && <div className="auth-message">{message}</div>}
      <div className="order-list">{visible.length === 0 ? <EmptyState icon="box" title="Bu durumda sipariş bulunmuyor." description="Filtreyi değiştirerek diğer sipariş durumlarına bakabilirsin." /> : visible.map((order) => {
        const address = Array.isArray(order.shipping_addresses) ? order.shipping_addresses[0] : order.shipping_addresses as any;
        const t = tracking[order.id] ?? { company: "", number: "" };
        return <article className="admin-order" key={order.id}>
          <div className="admin-order-top"><div><span>{new Date(order.created_at).toLocaleString("tr-TR")}</span><h2>{order.order_number}</h2><p>{order.commerce_order_items.map((item) => `${item.quantity} × ${item.product_name}`).join(" · ")}</p></div><div className="admin-status-controls"><em className={`payment-badge payment-${order.status.toLowerCase()}`}>{labels[order.status as Status] ?? order.status}</em><select value={order.status} onChange={(e) => updateOrder(order.id, e.target.value as Status)} disabled={saving === order.id}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
          <div className="admin-order-grid"><div><small>Müşteri</small><b>{order.customer_name || address?.recipient_name || "—"}</b><span>{order.guest_email}</span><span>{order.customer_phone || address?.phone}</span></div><div><small>Teslimat</small><b>{address ? `${address.district}, ${address.city}` : "—"}</b><span>{address?.address_line}</span></div><div><small>Tutar</small><b>{(order.total_kurus / 100).toLocaleString("tr-TR")} TL</b><span>{order.activation_claimed_at ? "Hesap etkin" : "Aktivasyon bekleniyor"}</span></div></div>
          <div className="payment-retry"><label>Kargo firması<input value={t.company} onChange={(e) => setTracking((current) => ({ ...current, [order.id]: { ...t, company: e.target.value } }))} placeholder="Örn. Yurtiçi Kargo" /></label><label>Takip numarası<input value={t.number} onChange={(e) => setTracking((current) => ({ ...current, [order.id]: { ...t, number: e.target.value } }))} placeholder="Takip numarası" /></label><div className="admin-order-actions"><button type="button" onClick={() => updateOrder(order.id, order.status === "SHIPPED" ? "SHIPPED" : "PREPARING")} disabled={saving === order.id}>{saving === order.id ? "Kaydediliyor..." : "Bilgileri Kaydet"}</button>{!order.activation_claimed_at && order.status === "PAID" && <button className="secondary" type="button" onClick={() => resendActivation(order.id)} disabled={saving === order.id}>Aktivasyonu Yeniden Gönder</button>}</div></div>
        </article>;
      })}</div>
      </>}

      {tab === "reconciliation" && <>
        <div className="admin-stats">
          <article><small>Kontrol edilen sipariş</small><b>{reconciliationSummary.checkedOrders}</b></article>
          <article><small>İnceleme gerekiyor</small><b>{reconciliationSummary.requiresReview}</b></article>
          <article><small>Açık fulfillment kaydı</small><b>{reconciliationSummary.openFulfillmentIssues}</b></article>
          <article><small>Yetim PAID attempt</small><b>{reconciliationSummary.orphanPaidAttempts}</b></article>
        </div>
        <div className="admin-reconciliation-intro">
          <div><h2>Ödeme → sipariş → entitlement mutabakatı</h2><p>Ödeme başarı durumunu fulfillment sorunlarından ayırır. Çözüldü işareti ödeme durumunu değiştirmez. iyzico’dan çek, callback gelmemiş PENDING denemeyi gerçek retrieve ile işler.</p></div>
          <div>
            <button type="button" className="secondary" onClick={() => void loadReconciliation()} disabled={reconciliationLoading}>{reconciliationLoading ? "Kontrol ediliyor…" : "Yeniden Kontrol Et"}</button>
            <button type="button" className="secondary" onClick={() => void runPaidReconciliation()} disabled={reconcilingPaid}>{reconcilingPaid ? "Onarılıyor…" : "Ödenmiş siparişleri onar"}</button>
          </div>
        </div>
        {reconciliationMessage && <div className="auth-message" role="status">{reconciliationMessage}</div>}
        {reconciliationLoading && reconciliationRows.length === 0 ? <LoadingState label="Ödeme mutabakatı kontrol ediliyor" /> : (
          <div className="order-list">
            {reconciliationRows.filter((row) => row.requiresReview).length === 0 ? <EmptyState icon="check" title="Açık mutabakat sorunu yok." description="Kontrol edilen siparişlerde ödeme ve fulfillment durumu arasında P0 seviyesinde tutarsızlık bulunmadı." /> : reconciliationRows.filter((row) => row.requiresReview).map((row) => (
              <article className="admin-order reconciliation-order" key={row.id}>
                <div className="admin-order-top">
                  <div><span>{new Date(row.created_at).toLocaleString("tr-TR")}</span><h2>{row.order_number}</h2><p>{row.guest_email}</p></div>
                  <div className="admin-status-controls"><em className="payment-badge payment-failed">İNCELEME GEREKİYOR</em><span>{(row.total_kurus / 100).toLocaleString("tr-TR")} {row.currency}</span></div>
                </div>
                <div className="reconciliation-flags" aria-label="Mutabakat uyarıları">{row.flags.map((flag) => <span key={flag}>{flag}</span>)}</div>
                {row.flags.includes("PENDING_ATTEMPT_STALE") && <div className="admin-order-actions"><button type="button" onClick={() => void retrieveIyzico(row.id)} disabled={retrievingOrderId === row.id}>{retrievingOrderId === row.id ? "iyzico’dan çekiliyor…" : "iyzico’dan çek"}</button></div>}
                <div className="admin-order-grid">
                  <div><small>Sipariş durumu</small><b>{row.status}</b><span>{row.paid_at ? `Ödeme tarihi: ${new Date(row.paid_at).toLocaleString("tr-TR")}` : "Ödeme tarihi yok"}</span></div>
                  <div><small>Payment attempt</small><b>{row.paymentAttempts[0]?.status ?? "YOK"}</b><span>{row.paymentAttempts[0]?.provider_payment_id ?? row.paymentAttempts[0]?.error_code ?? "Sağlayıcı referansı yok"}</span></div>
                  <div><small>Aktivasyon</small><b>{row.activation_claimed_at ? "Tamamlandı" : row.user_id ? "Hesap var, claim bekliyor" : "Hesap bağlantısı bekleniyor"}</b><span>{row.openIssueCount} açık fulfillment kaydı</span></div>
                </div>
                {row.fulfillmentIssues.filter((issue) => !issue.resolved_at).map((issue) => (
                  <div className="reconciliation-issue" key={issue.id}>
                    <div><small>Fulfillment sorunu</small><b>{issue.issue_code}</b><span>{new Date(issue.created_at).toLocaleString("tr-TR")}</span></div>
                    <label htmlFor={`resolution-${issue.id}`}>Çözüm notu<input id={`resolution-${issue.id}`} value={resolutionNotes[issue.id] ?? ""} onChange={(e) => setResolutionNotes((current) => ({ ...current, [issue.id]: e.target.value }))} placeholder="Gerçek neden ve yapılan düzeltmeyi yazın" /></label>
                    <button type="button" onClick={() => void resolveReconciliationIssue(issue.id)} disabled={resolvingIssue === issue.id}>{resolvingIssue === issue.id ? "Kaydediliyor…" : "Çözüldü Olarak İşaretle"}</button>
                  </div>
                ))}
              </article>
            ))}
          </div>
        )}
      </>}

      {tab === "corporate" && <>
        <div className="admin-corporate-shell">
          <form className="order-form" onSubmit={provisionOrganization}>
            <section>
              <h2>Yeni şirket (tenant) oluştur</h2>
              <p className="admin-helper-copy">Şirket oluşturmak kullanıcı bağlamaz. Corporate ID otomatik üretilir ve değişmez. Vergi numarası tektir; şirket adı tekrar edebilir. Owner/Admin/HR ayrıca bağlanır.</p>
              <label>Şirket adı<input required value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="Örn. Acme Mühendislik" /></label>
              <label>Vergi numarası<input required value={form.taxNumber} onChange={(e) => setForm((v) => ({ ...v, taxNumber: e.target.value }))} placeholder="Vergi kimlik no" /></label>
              <label>Vergi dairesi<input value={form.taxOffice} onChange={(e) => setForm((v) => ({ ...v, taxOffice: e.target.value }))} placeholder="İsteğe bağlı" /></label>
              <label>Yasal adres<input value={form.legalAddress} onChange={(e) => setForm((v) => ({ ...v, legalAddress: e.target.value }))} /></label>
              <label>Şehir<input value={form.city} onChange={(e) => setForm((v) => ({ ...v, city: e.target.value }))} /></label>
              <label>Paket<select value={form.planCode} onChange={(e) => setForm((v) => ({ ...v, planCode: e.target.value }))}>{plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} {plan.seat_limit ? `(${plan.seat_limit} çalışan)` : "(özel limit gerekir)"}</option>)}</select></label>
              <label>Çalışan limiti<input type="number" min={1} value={form.employeeLimit} onChange={(e) => setForm((v) => ({ ...v, employeeLimit: e.target.value }))} placeholder={selectedPlan?.seat_limit ? String(selectedPlan.seat_limit) : "Zorunlu"} /></label>
              <label>Dijital kart limiti<input type="number" min={0} value={form.digitalCardLimit} onChange={(e) => setForm((v) => ({ ...v, digitalCardLimit: e.target.value }))} /></label>
              <label>Fiziksel kart limiti<input type="number" min={0} value={form.physicalCardLimit} onChange={(e) => setForm((v) => ({ ...v, physicalCardLimit: e.target.value }))} /></label>
              <label>Mail kredisi<input type="number" min={0} value={form.mailCreditLimit} onChange={(e) => setForm((v) => ({ ...v, mailCreditLimit: e.target.value }))} placeholder={selectedPlan?.seat_limit ? String(networkMailGrant(selectedPlan.seat_limit)) : "Kişi başı 100"} /></label>
              <label>Durum<select value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value as "ACTIVE" | "SUSPENDED" }))}><option value="ACTIVE">Aktif</option><option value="SUSPENDED">Pasif</option></select></label>
              <label>Abonelik süresi (gün) <small className="optional-label">İsteğe bağlı — boş bırakılırsa {form.billingPeriod === "MONTHLY" ? "30" : "365"} gün</small><input type="number" min={1} max={3650} value={form.termDays} onChange={(e) => setForm((v) => ({ ...v, termDays: e.target.value }))} /></label>
              <button className="admin-provision-button order-submit" disabled={provisioning}>{provisioning ? "Oluşturuluyor..." : "Şirketi Oluştur"}</button>
              {corporateMessage && <div className="auth-message">{corporateMessage}</div>}
            </section>
          </form>

          <div className="admin-corporate-list">
            <h2>Mevcut şirketler</h2>
            {corporateLoading ? <LoadingState label="Kurumsal hesaplar yükleniyor" /> : accounts.length === 0 ? <EmptyState icon="building" title="Henüz şirket yok." description="Soldaki form şirket oluşturur; kullanıcılar sonra bağlanır." /> : accounts.map((account) => {
              const attach = attachForm[account.id] || { email: "", fullName: "", role: "OWNER" as const };
              return (
              <article className="admin-order" key={account.id}>
                <div className="admin-order-top">
                  <div><span>{account.corporateId || "Corporate ID bekleniyor"}</span><h2>{account.name}</h2><p>{account.subscription?.business_plans?.name ?? "Abonelik yok"} · VN {account.taxNumber || "—"}</p></div>
                  <div className="admin-status-controls"><em className={`payment-badge payment-${account.status.toLowerCase()}`}>{account.status === "ACTIVE" ? "Aktif" : "Pasif"}</em><button type="button" className="secondary" onClick={() => void setOrganizationStatus(account.id, account.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>{account.status === "ACTIVE" ? "Pasife al" : "Aktifleştir"}</button></div>
                </div>
                <div className="admin-order-grid">
                  <div><small>Çalışan / dijital / fiziksel</small><b>{account.entitlements ? `${account.usedSeats}/${account.entitlements.employee_limit} · ${account.entitlements.digital_card_limit} · ${account.entitlements.physical_card_limit}` : `${account.usedSeats} / ${account.subscription?.seat_limit ?? "—"}`}</b></div>
                  <div><small>Mail kredisi</small><b>{account.entitlements ? `${account.entitlements.mail_credits_remaining} / ${account.entitlements.mail_credit_limit}` : "—"}</b></div>
                  <div><small>Yöneticiler</small><b>{account.managers.length ? account.managers.map((manager) => `${manager.role} ${manager.email}`).join(" · ") : "Bağlı değil"}</b></div>
                </div>
                <div className="payment-retry">
                  <label>E-posta ile bağla<input type="email" value={attach.email} onChange={(e) => setAttachForm((current) => ({ ...current, [account.id]: { ...attach, email: e.target.value } }))} placeholder="mevcut kullanıcı veya davet" /></label>
                  <label>Ad soyad<input value={attach.fullName} onChange={(e) => setAttachForm((current) => ({ ...current, [account.id]: { ...attach, fullName: e.target.value } }))} /></label>
                  <label>Rol<select value={attach.role} onChange={(e) => setAttachForm((current) => ({ ...current, [account.id]: { ...attach, role: e.target.value as "OWNER" | "ADMIN" | "HR" } }))}><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="HR">HR</option></select></label>
                  <button type="button" onClick={() => void attachManager(account.id)} disabled={provisioning}>Kullanıcıyı Bağla</button>
                </div>
              </article>
            ); })}
          </div>
        </div>
      </>}
    </section>
  </main>;
}
