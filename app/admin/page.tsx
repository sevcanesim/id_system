"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import {
  type AudienceFilter, type Order, type OrderStatus, type OperationsFilter, type ProductFilter, type Status,
  itemSku, classifyProduct, orderAudience, orderOperationsState, needsPhysicalFulfillment,
} from "../../lib/admin/order-classification";
import type { AttachManagerForm, BusinessPlan, CorporateAccount, CorporateForm, ReconciliationRow, ReconciliationSummary } from "./domain/types";
import OrdersTab from "./components/OrdersTab";
import ReconciliationTab from "./components/ReconciliationTab";
import CorporateTab from "./components/CorporateTab";
import OrderDetailDrawer from "./components/OrderDetailDrawer";
import styles from "./AdminSales.module.css";

export default function AdminPage() {
  const [tab, setTab] = useState<"orders" | "reconciliation" | "corporate">("orders");
  const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true); const [authorized, setAuthorized] = useState(true); const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL"); const [audienceFilter, setAudienceFilter] = useState<AudienceFilter>("ALL"); const [productFilter, setProductFilter] = useState<ProductFilter>("ALL"); const [operationsFilter, setOperationsFilter] = useState<OperationsFilter>("ALL"); const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null); const [tracking, setTracking] = useState<Record<string, { company: string; number: string }>>({}); const [saving, setSaving] = useState<string | null>(null);
  const [reconciliationRows, setReconciliationRows] = useState<ReconciliationRow[]>([]); const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary>({ checkedOrders: 0, requiresReview: 0, openFulfillmentIssues: 0, orphanPaidAttempts: 0 }); const [reconciliationLoading, setReconciliationLoading] = useState(false); const [reconciliationMessage, setReconciliationMessage] = useState(""); const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({}); const [resolvingIssue, setResolvingIssue] = useState<string | null>(null); const [retrievingOrderId, setRetrievingOrderId] = useState<string | null>(null); const [reconcilingPaid, setReconcilingPaid] = useState(false);
  const [accounts, setAccounts] = useState<CorporateAccount[]>([]); const [plans, setPlans] = useState<BusinessPlan[]>([]); const [corporateLoading, setCorporateLoading] = useState(false); const [corporateMessage, setCorporateMessage] = useState(""); const [provisioning, setProvisioning] = useState(false);
  const [form, setForm] = useState<CorporateForm>({ name: "", taxNumber: "", taxOffice: "", legalAddress: "", city: "", planCode: "CORP-10", employeeLimit: "", digitalCardLimit: "", physicalCardLimit: "", mailCreditLimit: "", billingPeriod: "YEARLY", termDays: "", status: "ACTIVE" });
  const [attachForm, setAttachForm] = useState<Record<string, AttachManagerForm>>({});

  async function getToken() { const supabase = getSupabaseBrowserClient(); const { data } = await supabase?.auth.getSession() ?? { data: { session: null } }; return data.session?.access_token ?? null; }
  async function load() {
    const token = await getToken(); if (!token) { setAuthorized(false); setLoading(false); return; }
    try { const response = await fetch("/api/admin/commerce/orders", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }); const result = await response.json(); if (response.status === 403) setAuthorized(false); else if (!response.ok) setMessage(result.error ?? "Siparişler yüklenemedi."); else { setOrders(result.orders ?? []); setTracking(Object.fromEntries((result.orders ?? []).map((order: Order) => [order.id, { company: order.tracking_company ?? "", number: order.tracking_number ?? "" }]))); } } catch { setMessage("Sunucuya ulaşılamadı."); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function updateOrder(orderId: string, status: Status) {
    const token = await getToken(); if (!token) return; setSaving(orderId); setMessage(""); const t = tracking[orderId] ?? { company: "", number: "" };
    try { const response = await fetch("/api/admin/commerce/orders", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId, action: "UPDATE_ORDER", status, trackingCompany: t.company || null, trackingNumber: t.number || null }) }); const result = await response.json(); if (!response.ok) setMessage(result.error ?? "Sipariş güncellenemedi."); else await load(); } catch { setMessage("Güncelleme sırasında sunucuya ulaşılamadı."); } finally { setSaving(null); }
  }
  async function resendActivation(orderId: string) {
    const token = await getToken(); if (!token) return; setSaving(orderId); setMessage("");
    try { const response = await fetch("/api/admin/commerce/orders", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orderId, action: "RESEND_ACTIVATION" }) }); const result = await response.json(); setMessage(response.ok ? (result.message ?? "Aktivasyon bağlantısı yeniden gönderildi.") : (result.error ?? "Aktivasyon bağlantısı gönderilemedi.")); } catch { setMessage("Aktivasyon gönderilirken sunucuya ulaşılamadı."); } finally { setSaving(null); }
  }

  async function loadReconciliation() { const token = await getToken(); if (!token) return; setReconciliationLoading(true); setReconciliationMessage(""); try { const response = await fetch("/api/admin/commerce/reconciliation", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }); const result = await response.json(); if (!response.ok) setReconciliationMessage(result.error ?? "Ödeme mutabakatı yüklenemedi."); else { setReconciliationRows(result.rows ?? []); setReconciliationSummary(result.summary ?? { checkedOrders: 0, requiresReview: 0, openFulfillmentIssues: 0, orphanPaidAttempts: 0 }); } } catch { setReconciliationMessage("Ödeme mutabakatı için sunucuya ulaşılamadı."); } finally { setReconciliationLoading(false); } }
  useEffect(() => { if (tab === "reconciliation" && reconciliationRows.length === 0 && !reconciliationLoading) void loadReconciliation(); }, [tab]);
  async function resolveReconciliationIssue(issueId: string) { const note = (resolutionNotes[issueId] ?? "").trim(); if (note.length < 8) { setReconciliationMessage("Çözüm notu en az 8 karakter olmalı."); return; } const token = await getToken(); if (!token) return; setResolvingIssue(issueId); try { const response = await fetch("/api/admin/commerce/reconciliation", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ issueId, resolutionNote: note }) }); const result = await response.json(); if (!response.ok) setReconciliationMessage(result.error ?? "Mutabakat kaydı çözümlenemedi."); else { setReconciliationMessage("Mutabakat kaydı çözümlendi."); await loadReconciliation(); } } finally { setResolvingIssue(null); } }
  async function retrieveIyzico(orderId: string) { const token = await getToken(); if (!token) return; setRetrievingOrderId(orderId); try { const response = await fetch("/api/admin/commerce/reconciliation", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "retrieve_iyzico", orderId }) }); const result = await response.json(); setReconciliationMessage(response.ok ? (result.paid ? "iyzico ödemesi doğrulandı ve sipariş işlendi." : result.pending ? "iyzico henüz kesin sonuç vermedi." : "iyzico ödemeyi onaylamadı.") : (result.error ?? "iyzico çekimi tamamlanamadı.")); await loadReconciliation(); } finally { setRetrievingOrderId(null); } }
  async function runPaidReconciliation() { const token = await getToken(); if (!token) return; setReconcilingPaid(true); try { const response = await fetch("/api/admin/commerce/reconciliation", { method: "POST", headers: { Authorization: `Bearer ${token}` } }); const result = await response.json(); setReconciliationMessage(response.ok ? "Kayıtlı PAID siparişler onarıldı." : (result.error ?? "Onarım çalıştırılamadı.")); await loadReconciliation(); } finally { setReconcilingPaid(false); } }

  async function loadCorporate() { const token = await getToken(); if (!token) return; setCorporateLoading(true); try { const response = await fetch("/api/admin/organizations", { headers: { Authorization: `Bearer ${token}` } }); const result = await response.json(); if (!response.ok) setCorporateMessage(result.error ?? "Kurumsal hesaplar yüklenemedi."); else { setAccounts(result.accounts ?? []); setPlans(result.plans ?? []); } } finally { setCorporateLoading(false); } }
  useEffect(() => { if (tab === "corporate" && accounts.length === 0 && !corporateLoading) void loadCorporate(); }, [tab]);
  async function provisionOrganization(event: FormEvent) { event.preventDefault(); const token = await getToken(); if (!token) return; setProvisioning(true); setCorporateMessage(""); try { const response = await fetch("/api/admin/organizations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "create_tenant", name: form.name, taxNumber: form.taxNumber, taxOffice: form.taxOffice, legalAddress: form.legalAddress, city: form.city, planCode: form.planCode, employeeLimit: form.employeeLimit ? Number(form.employeeLimit) : undefined, digitalCardLimit: form.digitalCardLimit ? Number(form.digitalCardLimit) : undefined, physicalCardLimit: form.physicalCardLimit ? Number(form.physicalCardLimit) : undefined, mailCreditLimit: form.mailCreditLimit ? Number(form.mailCreditLimit) : undefined, billingPeriod: form.billingPeriod, termDays: form.termDays ? Number(form.termDays) : undefined, status: form.status }) }); const result = await response.json(); if (!response.ok) setCorporateMessage(result.error ?? "Şirket oluşturulamadı."); else { setCorporateMessage(`${result.organization.name} oluşturuldu.`); await loadCorporate(); } } finally { setProvisioning(false); } }
  async function attachManager(organizationId: string) { const fields = attachForm[organizationId]; if (!fields?.email || !fields.fullName) { setCorporateMessage("Yönetici e-postası ve adı gerekli."); return; } const token = await getToken(); if (!token) return; setProvisioning(true); try { const response = await fetch("/api/admin/organizations", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action: "attach_manager", organizationId, email: fields.email, fullName: fields.fullName, role: fields.role || "OWNER" }) }); const result = await response.json(); setCorporateMessage(response.ok ? `${fields.email} şirkete bağlandı.` : (result.error ?? "Yönetici bağlanamadı.")); if (response.ok) await loadCorporate(); } finally { setProvisioning(false); } }
  async function setOrganizationStatus(organizationId: string, status: "ACTIVE" | "SUSPENDED") { const token = await getToken(); if (!token) return; const response = await fetch("/api/admin/organizations", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ organizationId, status }) }); const result = await response.json(); if (!response.ok) setCorporateMessage(result.error ?? "Durum güncellenemedi."); else await loadCorporate(); }

  const selectedPlan = plans.find((plan) => plan.code === form.planCode);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const stats = useMemo(() => ({
    attention: orders.filter((order) => ["PAYMENT_PENDING", "ACTIVATION_PENDING", "FULFILLMENT", "SHIPPING", "ISSUE"].includes(orderOperationsState(order))).length,
    activation: orders.filter((order) => orderOperationsState(order) === "ACTIVATION_PENDING").length,
    fulfillment: orders.filter((order) => ["FULFILLMENT", "SHIPPING"].includes(orderOperationsState(order)) && needsPhysicalFulfillment(order)).length,
    revenue: orders.filter((order) => !["CANCELLED", "REFUNDED"].includes(order.status)).reduce((sum, order) => sum + order.total_kurus, 0),
  }), [orders]);
  const visible = orders.filter((order) => {
    if (statusFilter !== "ALL" && order.status !== statusFilter) return false; if (audienceFilter !== "ALL" && orderAudience(order) !== audienceFilter) return false; if (operationsFilter !== "ALL" && orderOperationsState(order) !== operationsFilter) return false; if (productFilter !== "ALL" && !order.commerce_order_items.some((item) => classifyProduct(item) === productFilter)) return false;
    const needle = search.trim().toLocaleLowerCase("tr-TR"); if (!needle) return true; const address = Array.isArray(order.shipping_addresses) ? order.shipping_addresses[0] : order.shipping_addresses;
    return [order.order_number, order.customer_name, order.guest_email, order.company_name, order.tax_number, address?.city, ...order.commerce_order_items.flatMap((item) => [item.product_name, itemSku(item)])].filter(Boolean).some((value) => String(value).toLocaleLowerCase("tr-TR").includes(needle));
  });

  if (loading) return <main className={styles.page}><section className={styles.shell}><div className={styles.message}>Satış verileri yükleniyor…</div></section></main>;
  if (!authorized) return <main className={styles.page}><section className={styles.shell}><div className={styles.message}>Bu alan yalnız Super Admin kullanıcılarına açıktır. <Link href="/giris">Giriş yap</Link></div></section></main>;

  return <main id="main-content" className={styles.page}><section className={styles.shell}>
    <div className={styles.heading}><div><span className={styles.kicker}>SATIŞ KONTROL MERKEZİ</span><h1>Satışları listeleme değil, aksiyon sırasına göre yönet.</h1><p>Bireysel ve kurumsal alımlar aynı kayıt havuzunda; ödeme, aktivasyon, fulfillment ve teslimat birbirinden ayrı durumlar olarak izlenir.</p></div><button type="button" className={styles.button} onClick={() => void load()}>Veriyi yenile</button></div>
    <div className={styles.tabs} role="tablist"><button type="button" role="tab" aria-selected={tab === "orders"} onClick={() => setTab("orders")}>Satış Kuyruğu</button><button type="button" role="tab" aria-selected={tab === "reconciliation"} onClick={() => setTab("reconciliation")}>Ödeme Mutabakatı</button><button type="button" role="tab" aria-selected={tab === "corporate"} onClick={() => setTab("corporate")}>Kurumsal Hesaplar</button></div>

    {tab === "orders" && <OrdersTab
      stats={stats} visible={visible} message={message}
      search={search} setSearch={setSearch}
      audienceFilter={audienceFilter} setAudienceFilter={setAudienceFilter}
      productFilter={productFilter} setProductFilter={setProductFilter}
      operationsFilter={operationsFilter} setOperationsFilter={setOperationsFilter}
      statusFilter={statusFilter} setStatusFilter={setStatusFilter}
      onSelectOrder={setSelectedOrderId}
    />}

    {tab === "reconciliation" && <ReconciliationTab
      summary={reconciliationSummary} rows={reconciliationRows} message={reconciliationMessage}
      loading={reconciliationLoading} reconcilingPaid={reconcilingPaid}
      resolutionNotes={resolutionNotes} setResolutionNotes={setResolutionNotes}
      resolvingIssue={resolvingIssue} retrievingOrderId={retrievingOrderId}
      onReload={() => void loadReconciliation()}
      onRunPaidReconciliation={() => void runPaidReconciliation()}
      onRetrieveIyzico={(orderId) => void retrieveIyzico(orderId)}
      onResolveIssue={(issueId) => void resolveReconciliationIssue(issueId)}
    />}

    {tab === "corporate" && <CorporateTab
      form={form} setForm={setForm} plans={plans} selectedPlan={selectedPlan}
      provisioning={provisioning} corporateMessage={corporateMessage} onProvision={provisionOrganization}
      accounts={accounts} corporateLoading={corporateLoading}
      attachForm={attachForm} setAttachForm={setAttachForm}
      onAttachManager={(organizationId) => void attachManager(organizationId)}
      onSetOrganizationStatus={(organizationId, status) => void setOrganizationStatus(organizationId, status)}
    />}
  </section>

  {selectedOrder && <OrderDetailDrawer
    order={selectedOrder} tracking={tracking} setTracking={setTracking} saving={saving}
    onClose={() => setSelectedOrderId(null)}
    onUpdateOrder={(orderId, status) => void updateOrder(orderId, status)}
    onResendActivation={(orderId) => void resendActivation(orderId)}
  />}
  </main>;
}
