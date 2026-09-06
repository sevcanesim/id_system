"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import styles from "./AdminOperations.module.css";

type Tab = "print" | "network" | "batches" | "leads" | "privacy" | "pricing" | "audit";
type LoadState = "idle" | "loading" | "ready" | "error";
type PrintUnit = {
  id: string;
  operations_status: string;
  carrier: string | null;
  tracking_number: string | null;
  print_requested_at: string | null;
  print_started_at: string | null;
  print_approved_at: string | null;
  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  order?: { order_number?: string; customer_name?: string | null; guest_email?: string; paid_at?: string | null } | null;
  item?: { product_name?: string | null } | null;
};
type PremiumUser = {
  id: string;
  user_id: string;
  network_mail_limit: number;
  network_mail_remaining: number;
  expires_at: string | null;
  profile?: { name?: string | null; email?: string | null } | null;
};
type CapacityTerm = {
  id: string;
  organization_id: string;
  source_order_id: string | null;
  card_count: number;
  starts_at: string;
  expires_at: string;
  renewal_price_kurus: number | null;
  currency: string;
  status: string;
  organization?: { name?: string | null; corporate_id?: string | null } | null;
};
type RenewalNotice = { id: string; term_id: string; organization_id: string; due_at: string; renewal_price_kurus: number; status: string; invoice_reference: string | null };
type AuditRow = { id: string; actor_user_id: string | null; action: string; target_table: string; target_id: string | null; before_value: unknown; after_value: unknown; created_at: string };
type MailAdjustment = { id: string; user_id: string | null; organization_id: string | null; delta: number; balance_before: number; balance_after: number; reason: string; created_at: string };
type JobRun = { id: string; job_name: string; status: "RUNNING" | "SUCCEEDED" | "FAILED"; started_at: string; finished_at: string | null; processed_count: number | null; error_code: string | null };
type PrivacyRequest = { id: string; user_id: string; request_type: "ACCESS" | "ERASURE"; status: "SUBMITTED" | "IN_REVIEW" | "IDENTITY_VERIFIED" | "COMPLETED" | "REJECTED" | "CANCELLED"; identity_verified_at: string | null; resolved_at: string | null; resolution_code: string | null; created_at: string; account?: { yenomi_id?: string | null; display_name?: string | null; status?: string | null } | null };
type CorporateLead = { id: string; contact: { fullName: string; email: string; company: string; employeeCount: string; message: string }; plan: string | null; source: string | null; status: "NEW" | "CONTACTED" | "QUALIFIED" | "CLOSED" | "SPAM"; notificationStatus: "PENDING" | "PROCESSING" | "RETRYABLE" | "DELIVERED" | "FAILED" | "LEGACY_UNVERIFIED"; notificationAttempts: number; firstNotifiedAt: string | null; lastNotifiedAt: string | null; lastNotificationErrorCode: string | null; createdAt: string; updatedAt: string; encrypted: boolean };
type OperationsPayload = { printQueue: PrintUnit[]; premiumUsers: PremiumUser[]; capacityTerms: CapacityTerm[]; renewalNotices: RenewalNotice[]; mailAdjustments: MailAdjustment[]; jobRuns: JobRun[]; privacyRequests: PrivacyRequest[]; corporateLeads: CorporateLead[]; auditLog: AuditRow[]; demo?: boolean };
type Variant = { id: string; sku: string; name: string; price_kurus: number; billing_period: string; is_active: boolean };
type Plan = { id: string; code: string; name: string; seat_limit: number | null; annual_price_kurus: number | null; is_active: boolean };

const emptyOperations: OperationsPayload = { printQueue: [], premiumUsers: [], capacityTerms: [], renewalNotices: [], mailAdjustments: [], jobRuns: [], privacyRequests: [], corporateLeads: [], auditLog: [], demo: false };

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatMoney(value?: number | null) {
  if (value == null) return "—";
  return `${(value / 100).toLocaleString("tr-TR")} TL`;
}

export default function AdminOperationsPage() {
  const [tab, setTab] = useState<Tab>("print");
  const [data, setData] = useState<OperationsPayload>(emptyOperations);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [demoMode, setDemoMode] = useState(false);
  const [operationsState, setOperationsState] = useState<LoadState>("loading");
  const [pricingState, setPricingState] = useState<LoadState>("loading");
  const [operationsError, setOperationsError] = useState("");
  const [pricingError, setPricingError] = useState("");
  const [authorized, setAuthorized] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [shipping, setShipping] = useState<Record<string, { carrier: string; tracking: string }>>({});
  const [mailForm, setMailForm] = useState<Record<string, { amount: string; reason: string }>>({});
  const [priceDraft, setPriceDraft] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function token() {
    const supabase = getSupabaseBrowserClient();
    const { data: session } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
    return session.session?.access_token ?? null;
  }

  async function load(mode = demoMode) {
    const accessToken = await token();
    if (!accessToken) { setAuthorized(false); setOperationsState("error"); setPricingState("error"); return; }
    setAuthorized(true);
    setMessage("");
    setOperationsError("");
    setPricingError("");
    setOperationsState("loading");
    setPricingState("loading");
    const headers = { Authorization: `Bearer ${accessToken}` };
    const suffix = mode ? "?demo=1" : "";

    const [operationsResult, pricingResult] = await Promise.allSettled([
      fetch(`/api/admin/operations${suffix}`, { headers, cache: "no-store" }),
      fetch(`/api/admin/pricing${suffix}`, { headers, cache: "no-store" }),
    ]);

    if (operationsResult.status === "fulfilled") {
      const response = operationsResult.value;
      if (response.status === 403) { setAuthorized(false); setOperationsState("error"); }
      else {
        const json = await response.json().catch(() => ({}));
        if (response.ok) {
          setData(json);
          setOperationsState("ready");
          setShipping(Object.fromEntries((json.printQueue ?? []).map((unit: PrintUnit) => [unit.id, { carrier: unit.carrier ?? "", tracking: unit.tracking_number ?? "" }])));
        } else {
          setData(emptyOperations);
          setOperationsState("error");
          setOperationsError(json.error || "Gerçek operasyon verisi okunamadı.");
        }
      }
    } else {
      setData(emptyOperations);
      setOperationsState("error");
      setOperationsError("Operasyon servisine ulaşılamadı.");
    }

    if (pricingResult.status === "fulfilled") {
      const response = pricingResult.value;
      if (response.status === 403) { setAuthorized(false); setPricingState("error"); }
      else {
        const json = await response.json().catch(() => ({}));
        if (response.ok) {
          setVariants(json.variants ?? []);
          setPlans(json.plans ?? []);
          setPricingState("ready");
          setPriceDraft(Object.fromEntries([...(json.variants ?? []).map((item: Variant) => [`variant:${item.sku}`, String(item.price_kurus / 100)]), ...(json.plans ?? []).map((item: Plan) => [`plan:${item.code}`, String((item.annual_price_kurus ?? 0) / 100)])]));
        } else {
          setVariants([]); setPlans([]); setPricingState("error"); setPricingError(json.error || "Fiyat kataloğu okunamadı.");
        }
      }
    } else {
      setVariants([]); setPlans([]); setPricingState("error"); setPricingError("Fiyat servisine ulaşılamadı.");
    }
  }

  useEffect(() => { void load(false); }, []);

  async function switchMode(nextDemo: boolean) {
    setDemoMode(nextDemo);
    await load(nextDemo);
  }

  async function patchOperations(body: Record<string, unknown>, key: string) {
    if (demoMode) { setMessage("Demo modunda değişiklik yapılamaz. Gerçek veriye geçerek işlem yapabilirsiniz."); return; }
    const accessToken = await token(); if (!accessToken) return;
    setSaving(key); setMessage("");
    try {
      const response = await fetch("/api/admin/operations", { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "İşlem tamamlanamadı.");
      setMessage("İşlem kaydedildi ve denetim günlüğüne işlendi.");
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally { setSaving(null); }
  }

  async function savePrice(kind: "PRODUCT_VARIANT" | "CORPORATE_PLAN", key: string, id: string) {
    if (demoMode) { setMessage("Demo modunda fiyat değiştirilemez."); return; }
    const value = Number(priceDraft[key]?.replace(",", "."));
    if (!Number.isFinite(value) || value < 0) { setMessage("Geçerli bir fiyat girin."); return; }
    const accessToken = await token(); if (!accessToken) return;
    setSaving(key); setMessage("");
    try {
      const response = await fetch("/api/admin/pricing", { method: "PATCH", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(kind === "PRODUCT_VARIANT" ? { kind, sku: id, priceKurus: Math.round(value * 100) } : { kind, code: id, priceKurus: Math.round(value * 100) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Fiyat güncellenemedi.");
      setMessage("Fiyat güncellendi ve audit log'a kaydedildi.");
      await load(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fiyat güncellenemedi.");
    } finally { setSaving(null); }
  }

  // Çapraz filtreler: organizasyon/sipariş no/e-posta serbest metin araması
  // ve tarih aralığı (yenileme penceresi dahil), aktif sekmenin veri setine
  // uygulanır. Her sekme kendi en anlamlı tarih alanını kullanır.
  const needle = search.trim().toLocaleLowerCase("tr-TR");
  function matchesSearch(...values: Array<string | null | undefined>) {
    if (!needle) return true;
    return values.filter(Boolean).some((value) => String(value).toLocaleLowerCase("tr-TR").includes(needle));
  }
  function inDateRange(value?: string | null) {
    if (!dateFrom && !dateTo) return true;
    if (!value) return false;
    const time = new Date(value).getTime();
    if (dateFrom && time < new Date(dateFrom).getTime()) return false;
    if (dateTo && time > new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1) return false;
    return true;
  }
  const filteredPrintQueue = useMemo(() => data.printQueue.filter((unit) =>
    matchesSearch(unit.order?.order_number, unit.order?.customer_name, unit.order?.guest_email, unit.item?.product_name, unit.tracking_number) &&
    inDateRange(unit.print_requested_at),
  ), [data.printQueue, needle, dateFrom, dateTo]);
  const filteredPremiumUsers = useMemo(() => data.premiumUsers.filter((user) =>
    matchesSearch(user.profile?.name, user.profile?.email, user.user_id) && inDateRange(user.expires_at),
  ), [data.premiumUsers, needle, dateFrom, dateTo]);
  const filteredCapacityTerms = useMemo(() => data.capacityTerms.filter((term) =>
    matchesSearch(term.organization?.name, term.organization?.corporate_id, term.organization_id, term.id) && inDateRange(term.expires_at),
  ), [data.capacityTerms, needle, dateFrom, dateTo]);
  const filteredRenewalNotices = useMemo(() => data.renewalNotices.filter((notice) =>
    matchesSearch(notice.term_id, notice.organization_id, notice.invoice_reference) && inDateRange(notice.due_at),
  ), [data.renewalNotices, needle, dateFrom, dateTo]);
  const filteredAuditLog = useMemo(() => data.auditLog.filter((row) =>
    matchesSearch(row.action, row.target_table, row.target_id, row.actor_user_id) && inDateRange(row.created_at),
  ), [data.auditLog, needle, dateFrom, dateTo]);
  const filteredPrivacyRequests = useMemo(() => data.privacyRequests.filter((entry) =>
    matchesSearch(entry.account?.yenomi_id, entry.account?.display_name, entry.user_id, entry.request_type, entry.status) && inDateRange(entry.created_at),
  ), [data.privacyRequests, needle, dateFrom, dateTo]);
  const filteredCorporateLeads = useMemo(() => data.corporateLeads.filter((lead) =>
    matchesSearch(lead.contact.fullName, lead.contact.email, lead.contact.company, lead.plan, lead.status, lead.notificationStatus) && inDateRange(lead.createdAt),
  ), [data.corporateLeads, needle, dateFrom, dateTo]);

  const counts = useMemo(() => ({
    print: data.printQueue.filter((unit) => ["PRINT_PENDING", "PRINTING"].includes(unit.operations_status)).length,
    shipping: data.printQueue.filter((unit) => ["SHIPPING_PENDING", "IN_TRANSIT", "OUT_FOR_DELIVERY"].includes(unit.operations_status)).length,
    premium: data.premiumUsers.length,
    renewals: data.renewalNotices.filter((notice) => !["PAID", "CANCELLED"].includes(notice.status)).length,
  }), [data]);
  const count = (value: number) => operationsState === "ready" ? String(value) : "—";

  if (!authorized) return <main className={styles.page}><section className={styles.shell}><div className={styles.errorPanel}>Bu alan yalnız Super Admin kullanıcılarına açıktır. <Link href="/giris">Giriş yap</Link></div></section></main>;

  return <main id="main-content" className={styles.page}>
    <section className={styles.shell}>
      <div className={styles.heading}>
        <div><span className={styles.kicker}>OPERASYON KONTROL MERKEZİ</span><h1>Baskıdan yenilemeye tüm operasyonu yönet.</h1><p>Fiziksel kart üretimi, kargo, Premium Network Mail, bağımsız kurumsal lisans batchleri, fiyat kataloğu ve audit kayıtları.</p></div>
        <div className={styles.headingActions}><span className={demoMode ? styles.demoBadge : styles.liveBadge}>{demoMode ? "DEMO VERİ" : "GERÇEK VERİ"}</span><button type="button" className={styles.secondary} onClick={() => void load()}>Yenile</button><button type="button" className={demoMode ? styles.action : styles.secondary} onClick={() => void switchMode(!demoMode)}>{demoMode ? "Gerçek Veriye Dön" : "Demo Verilerle İncele"}</button></div>
      </div>

      {demoMode && <div className={styles.demoNotice}><strong>Demo modu açık.</strong> Bu kayıtlar sentetiktir ve hiçbir işlem veritabanına yazılmaz. Tüm değişiklik butonları devre dışıdır.</div>}
      {!demoMode && operationsState === "error" && <div className={styles.errorPanel}><div><strong>Gerçek operasyon verisi okunamadı.</strong><p>{operationsError || "Local veritabanı şeması veya veri kaynağı kontrol edilmeli."}</p></div><button type="button" className={styles.action} onClick={() => void switchMode(true)}>Demo verilerle incele</button></div>}
      {!demoMode && pricingState === "error" && <div className={styles.warningPanel}><strong>Fiyat kataloğu yüklenemedi.</strong> {pricingError}</div>}

      <div className={styles.stats}><div className={styles.stat}><small>Baskı kuyruğu</small><strong>{count(counts.print)}</strong></div><div className={styles.stat}><small>Kargo süreci</small><strong>{count(counts.shipping)}</strong></div><div className={styles.stat}><small>Premium kullanıcı</small><strong>{count(counts.premium)}</strong></div><div className={styles.stat}><small>Açık yenileme</small><strong>{count(counts.renewals)}</strong></div></div>
      <div className={styles.tabs} role="tablist">{([['print','Baskı & Kargo'],['network','Network Mail'],['batches','Lisans Batchleri'],['leads','Kurumsal Talepler'],['privacy','Gizlilik Talepleri'],['pricing','Fiyatlandırma'],['audit','Audit Log']] as const).map(([key,label]) => <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
      {tab !== "pricing" && <div className={styles.toolbar}>
        <label className={styles.field}><span className={styles.label}>Ara</span><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Organizasyon, sipariş no, e-posta" /></label>
        <label className={styles.field}><span className={styles.label}>Başlangıç</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
        <label className={styles.field}><span className={styles.label}>Bitiş (yenileme penceresi)</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
        {(search || dateFrom || dateTo) && <button type="button" className={styles.secondary} onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}>Filtreleri temizle</button>}
      </div>}
      {message && <div className={styles.message} role="status">{message}</div>}
      {operationsState === "loading" && tab !== "pricing" && <div className={styles.message}>Operasyon verileri yükleniyor…</div>}

      {tab === "print" && operationsState === "ready" && <div className={styles.grid}>{filteredPrintQueue.length === 0 ? <div className={styles.emptyState}><strong>{data.printQueue.length === 0 ? "Aktif baskı veya kargo kaydı yok." : "Filtrelerle eşleşen kayıt yok."}</strong><span>{data.printQueue.length === 0 ? "Yeni bir üretim kaydı oluştuğunda burada görünecek." : "Aramayı veya tarih aralığını değiştirin."}</span></div> : filteredPrintQueue.map((unit) => {
        const ship = shipping[unit.id] ?? { carrier: "", tracking: "" };
        return <article className={styles.card} key={unit.id}>
          <div className={styles.cardHead}><div><span className={styles.label}>{unit.order?.order_number ?? "KART ÜRETİMİ"}</span><h2>{unit.order?.customer_name || unit.order?.guest_email || "Kullanıcı"}</h2><p>{unit.item?.product_name || "Fiziksel Yenomi ID"} · Baskı talebi {formatDateTime(unit.print_requested_at)}</p></div><span className={styles.badge}>{unit.operations_status}</span></div>
          <div className={styles.fields}><label className={styles.field}><span className={styles.label}>Kargo firması</span><input disabled={demoMode} value={ship.carrier} onChange={(event) => setShipping((current) => ({ ...current, [unit.id]: { ...ship, carrier: event.target.value } }))} placeholder="Yurtiçi Kargo" /></label><label className={styles.field}><span className={styles.label}>Takip numarası</span><input disabled={demoMode} value={ship.tracking} onChange={(event) => setShipping((current) => ({ ...current, [unit.id]: { ...ship, tracking: event.target.value } }))} placeholder="Takip numarası" /></label><div className={styles.field}><span className={styles.label}>Son işlem</span><span className={styles.muted}>{formatDateTime(unit.delivered_at || unit.out_for_delivery_at || unit.shipped_at || unit.print_approved_at || unit.print_started_at || unit.print_requested_at)}</span></div></div>
          <div className={styles.actions}>
            {unit.operations_status === "PRINT_PENDING" && <button className={styles.secondary} type="button" disabled={demoMode || saving === unit.id} onClick={() => void patchOperations({ action: "START_PRINT", unitId: unit.id }, unit.id)}>Baskıyı Başlat</button>}
            {["PRINT_PENDING","PRINTING"].includes(unit.operations_status) && <button className={styles.action} type="button" disabled={demoMode || saving === unit.id} onClick={() => void patchOperations({ action: "APPROVE_PRINT", unitId: unit.id }, unit.id)}>Baskıyı Onayla</button>}
            {unit.operations_status === "SHIPPING_PENDING" && <button className={styles.action} type="button" disabled={demoMode || saving === unit.id} onClick={() => void patchOperations({ action: "SHIP", unitId: unit.id, carrier: ship.carrier, trackingNumber: ship.tracking }, unit.id)}>Kargoya Ver</button>}
            {unit.operations_status === "IN_TRANSIT" && <button className={styles.secondary} type="button" disabled={demoMode || saving === unit.id} onClick={() => void patchOperations({ action: "OUT_FOR_DELIVERY", unitId: unit.id }, unit.id)}>Dağıtıma Çıktı</button>}
            {["IN_TRANSIT","OUT_FOR_DELIVERY"].includes(unit.operations_status) && <button className={styles.action} type="button" disabled={demoMode || saving === unit.id} onClick={() => void patchOperations({ action: "DELIVER", unitId: unit.id }, unit.id)}>Teslim Edildi</button>}
          </div>
        </article>;
      })}</div>}

      {tab === "network" && operationsState === "ready" && <div className={styles.grid}>{filteredPremiumUsers.length === 0 && <div className={styles.emptyState}><strong>{data.premiumUsers.length === 0 ? "Premium kullanıcı kaydı yok." : "Filtrelerle eşleşen kullanıcı yok."}</strong><span>{data.premiumUsers.length === 0 ? "Aktif Premium haklar burada listelenecek." : "Aramayı veya tarih aralığını değiştirin."}</span></div>}{filteredPremiumUsers.map((user) => {
        const form = mailForm[user.user_id] ?? { amount: "100", reason: "" };
        return <article className={styles.card} key={user.id}><div className={styles.cardHead}><div><span className={styles.label}>BİREYSEL PREMIUM</span><h2>{user.profile?.name || user.profile?.email || user.user_id}</h2><p>Yenileme {formatDateTime(user.expires_at)}</p></div><span className={styles.badge}>{user.network_mail_remaining} / {user.network_mail_limit || 100}</span></div><div className={styles.fields}><label className={styles.field}><span className={styles.label}>Miktar</span><input disabled={demoMode} inputMode="numeric" value={form.amount} onChange={(event) => setMailForm((current) => ({ ...current, [user.user_id]: { ...form, amount: event.target.value } }))} /></label><label className={styles.field}><span className={styles.label}>Gerekçe</span><input disabled={demoMode} value={form.reason} onChange={(event) => setMailForm((current) => ({ ...current, [user.user_id]: { ...form, reason: event.target.value } }))} placeholder="Kota düzeltme nedeni" /></label></div><div className={styles.actions}><button disabled={demoMode} type="button" className={styles.secondary} onClick={() => void patchOperations({ action: "ADJUST_NETWORK_MAIL", scope: "INDIVIDUAL", userId: user.user_id, mode: "ADD", amount: Number(form.amount), reason: form.reason }, `mail:${user.user_id}`)}>Kota Ekle</button><button disabled={demoMode} type="button" className={styles.action} onClick={() => void patchOperations({ action: "ADJUST_NETWORK_MAIL", scope: "INDIVIDUAL", userId: user.user_id, mode: "RESET", amount: Number(form.amount), reason: form.reason }, `mail:${user.user_id}`)}>Kotayı Ayarla</button></div></article>;
      })}<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Tarih</th><th>Hedef</th><th>Değişim</th><th>Önce</th><th>Sonra</th><th>Gerekçe</th></tr></thead><tbody>{data.mailAdjustments.map((row) => <tr key={row.id}><td>{formatDateTime(row.created_at)}</td><td>{row.user_id || row.organization_id}</td><td>{row.delta > 0 ? `+${row.delta}` : row.delta}</td><td>{row.balance_before}</td><td>{row.balance_after}</td><td>{row.reason}</td></tr>)}</tbody></table></div></div>}

      {tab === "batches" && operationsState === "ready" && <div className={styles.grid}><div className={styles.actions}><button disabled={demoMode} className={styles.action} type="button" onClick={() => void patchOperations({ action: "QUEUE_RENEWALS", daysAhead: 30 }, "queue-renewals")}>30 Günlük Yenilemeleri Oluştur</button></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Şirket</th><th>Batch ID</th><th>Lisans</th><th>Satın alma / başlangıç</th><th>Yenileme</th><th>Yenileme ücreti</th><th>Durum</th></tr></thead><tbody>{filteredCapacityTerms.map((term) => <tr key={term.id}><td>{term.organization?.name || term.organization_id}</td><td>{term.id}</td><td>{term.card_count}</td><td>{formatDateTime(term.starts_at)}</td><td>{formatDateTime(term.expires_at)}</td><td>{formatMoney(term.renewal_price_kurus)}</td><td>{term.status}</td></tr>)}</tbody></table></div><div className={styles.grid}>{filteredRenewalNotices.map((notice) => <article className={styles.card} key={notice.id}><div className={styles.cardHead}><div><span className={styles.label}>YENİLEME KAYDI</span><h3>{notice.term_id}</h3><p>{formatDateTime(notice.due_at)} · {formatMoney(notice.renewal_price_kurus)}</p></div><span className={styles.badge}>{notice.status}</span></div><div className={styles.actions}>{notice.status === "PENDING" && <button disabled={demoMode} className={styles.secondary} type="button" onClick={() => void patchOperations({ action: "MARK_RENEWAL_NOTIFIED", noticeId: notice.id }, notice.id)}>Bildirim Gönderildi</button>}{["PENDING","NOTIFIED"].includes(notice.status) && <button disabled={demoMode} className={styles.action} type="button" onClick={() => { const ref = window.prompt("Fatura referansı"); if (ref) void patchOperations({ action: "MARK_RENEWAL_INVOICED", noticeId: notice.id, invoiceReference: ref }, notice.id); }}>Faturalandı</button>}{notice.status === "INVOICED" && <button disabled={demoMode} className={styles.action} type="button" onClick={() => void patchOperations({ action: "MARK_RENEWAL_PAID", noticeId: notice.id }, notice.id)}>Ödendi</button>}</div></article>)}</div></div>}

      {tab === "privacy" && operationsState === "ready" && <div className={styles.grid}>{filteredPrivacyRequests.length === 0 ? <div className={styles.emptyState}><strong>{data.privacyRequests.length === 0 ? "Açık gizlilik talebi yok." : "Filtrelerle eşleşen gizlilik talebi yok."}</strong><span>Talep oluşturulduğunda yalnız yetkili Super Admin tarafından bu alanda görülür.</span></div> : filteredPrivacyRequests.map((entry) => <article className={styles.card} key={entry.id}><div className={styles.cardHead}><div><span className={styles.label}>{entry.request_type === "ACCESS" ? "VERİ ERİŞİM TALEBİ" : "SİLME/DEĞERLENDİRME TALEBİ"}</span><h3>{entry.account?.display_name || entry.account?.yenomi_id || entry.user_id}</h3><p>{entry.account?.yenomi_id ? `Yenomi ID ${entry.account.yenomi_id} · ` : ""}{formatDateTime(entry.created_at)}</p></div><span className={styles.badge}>{entry.status}</span></div><div className={styles.fields}><div className={styles.field}><span className={styles.label}>Kimlik doğrulama</span><span className={styles.muted}>{formatDateTime(entry.identity_verified_at)}</span></div><div className={styles.field}><span className={styles.label}>Sonuç</span><span className={styles.muted}>{entry.resolution_code || "—"}</span></div></div><div className={styles.actions}>{entry.status === "SUBMITTED" && <button disabled={demoMode || saving === entry.id} className={styles.secondary} type="button" onClick={() => void patchOperations({ action: "UPDATE_PRIVACY_REQUEST", requestId: entry.id, status: "IN_REVIEW" }, entry.id)}>İncelemeye al</button>}{entry.status === "IN_REVIEW" && <><button disabled={demoMode || saving === entry.id} className={styles.action} type="button" onClick={() => void patchOperations({ action: "UPDATE_PRIVACY_REQUEST", requestId: entry.id, status: "IDENTITY_VERIFIED" }, entry.id)}>Kimliği doğrula</button><button disabled={demoMode || saving === entry.id} className={styles.secondary} type="button" onClick={() => void patchOperations({ action: "UPDATE_PRIVACY_REQUEST", requestId: entry.id, status: "REJECTED", resolutionCode: "REQUEST_REJECTED" }, entry.id)}>Reddet</button></>}{entry.status === "IDENTITY_VERIFIED" && <button disabled={demoMode || saving === entry.id} className={styles.action} type="button" onClick={() => void patchOperations({ action: "UPDATE_PRIVACY_REQUEST", requestId: entry.id, status: "COMPLETED", resolutionCode: entry.request_type === "ACCESS" ? "ACCESS_EXPORT_DELIVERED" : "ERASURE_REVIEW_COMPLETED" }, entry.id)}>Sonuçlandır</button>}</div></article>)}</div>}

      {tab === "leads" && operationsState === "ready" && <div className={styles.grid}>{filteredCorporateLeads.length === 0 ? <div className={styles.emptyState}><strong>{data.corporateLeads.length === 0 ? "Kurumsal teklif talebi yok." : "Filtrelerle eşleşen teklif talebi yok."}</strong><span>Yeni talepler burada şifreli kayıt olarak görünür; bildirim durumları e-posta teslimatından bağımsız izlenir.</span></div> : filteredCorporateLeads.map((lead) => <article className={styles.card} key={lead.id}><div className={styles.cardHead}><div><span className={styles.label}>KURUMSAL TEKLİF · {lead.plan || "GENEL"}</span><h3>{lead.contact.company}</h3><p>{lead.contact.fullName} · {lead.contact.email}</p></div><span className={styles.badge}>{lead.status}</span></div><div className={styles.fields}><div className={styles.field}><span className={styles.label}>Çalışan</span><span className={styles.muted}>{lead.contact.employeeCount}</span></div><div className={styles.field}><span className={styles.label}>Bildirim</span><span className={styles.muted}>{lead.notificationStatus} · {lead.notificationAttempts} deneme</span></div><div className={styles.field}><span className={styles.label}>Kayıt</span><span className={styles.muted}>{formatDateTime(lead.createdAt)}</span></div><div className={styles.field}><span className={styles.label}>Şifreleme</span><span className={styles.muted}>{lead.encrypted ? "AES-256-GCM" : "Eski kayıt — taşınmalı"}</span></div></div>{lead.contact.message && <p className={styles.muted}>{lead.contact.message}</p>}{lead.lastNotificationErrorCode && <p className={styles.muted}>Bildirim kodu: {lead.lastNotificationErrorCode}</p>}<div className={styles.actions}>{lead.status === "NEW" && <button disabled={demoMode || saving === lead.id} className={styles.secondary} type="button" onClick={() => void patchOperations({ action: "UPDATE_CORPORATE_LEAD", leadId: lead.id, status: "CONTACTED" }, lead.id)}>İletişime geçildi</button>}{["NEW", "CONTACTED"].includes(lead.status) && <button disabled={demoMode || saving === lead.id} className={styles.action} type="button" onClick={() => void patchOperations({ action: "UPDATE_CORPORATE_LEAD", leadId: lead.id, status: "QUALIFIED" }, lead.id)}>Teklife uygun</button>}{lead.status === "QUALIFIED" && <button disabled={demoMode || saving === lead.id} className={styles.action} type="button" onClick={() => void patchOperations({ action: "UPDATE_CORPORATE_LEAD", leadId: lead.id, status: "CLOSED" }, lead.id)}>Sonuçlandır</button>}{["FAILED", "RETRYABLE"].includes(lead.notificationStatus) && lead.encrypted && <button disabled={demoMode || saving === lead.id} className={styles.secondary} type="button" onClick={() => void patchOperations({ action: "RETRY_CORPORATE_LEAD_NOTIFICATION", leadId: lead.id }, lead.id)}>Bildirimi yeniden dene</button>}</div></article>)}</div>}

      {tab === "pricing" && <div className={styles.grid}>{pricingState === "loading" && <div className={styles.message}>Fiyat kataloğu yükleniyor…</div>}{pricingState === "error" && <div className={styles.errorPanel}>{pricingError || "Fiyat kataloğu yüklenemedi."}</div>}{pricingState === "ready" && <><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Ürün</th><th>SKU</th><th>Mevcut</th><th>Yeni fiyat (TL)</th><th></th></tr></thead><tbody>{variants.map((item) => { const key = `variant:${item.sku}`; return <tr key={item.id}><td>{item.name}</td><td>{item.sku}</td><td>{formatMoney(item.price_kurus)}</td><td><input disabled={demoMode} value={priceDraft[key] ?? ""} onChange={(event) => setPriceDraft((current) => ({ ...current, [key]: event.target.value }))} /></td><td><button className={styles.secondary} type="button" disabled={demoMode || saving === key} onClick={() => void savePrice("PRODUCT_VARIANT", key, item.sku)}>Kaydet</button></td></tr>; })}</tbody></table></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Kurumsal paket</th><th>Kod</th><th>Koltuk</th><th>Mevcut</th><th>Yeni fiyat (TL)</th><th></th></tr></thead><tbody>{plans.map((item) => { const key = `plan:${item.code}`; return <tr key={item.id}><td>{item.name}</td><td>{item.code}</td><td>{item.seat_limit ?? "—"}</td><td>{formatMoney(item.annual_price_kurus)}</td><td><input disabled={demoMode} value={priceDraft[key] ?? ""} onChange={(event) => setPriceDraft((current) => ({ ...current, [key]: event.target.value }))} /></td><td><button className={styles.secondary} type="button" disabled={demoMode || saving === key} onClick={() => void savePrice("CORPORATE_PLAN", key, item.code)}>Kaydet</button></td></tr>; })}</tbody></table></div></>}</div>}

      {tab === "audit" && operationsState === "ready" && <div className={styles.grid}><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>İş</th><th>Durum</th><th>Başladı</th><th>Bitti</th><th>İşlenen</th><th>Hata kodu</th></tr></thead><tbody>{data.jobRuns.length ? data.jobRuns.map((run) => <tr key={run.id}><td>{run.job_name}</td><td>{run.status}</td><td>{formatDateTime(run.started_at)}</td><td>{formatDateTime(run.finished_at)}</td><td>{run.processed_count ?? "—"}</td><td>{run.error_code ?? "—"}</td></tr>) : <tr><td colSpan={6}>Henüz kayıtlı operasyon çalışması yok.</td></tr>}</tbody></table></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Tarih</th><th>İşlem</th><th>Hedef</th><th>Actor</th><th>Değişiklik</th></tr></thead><tbody>{filteredAuditLog.map((row) => <tr key={row.id}><td>{formatDateTime(row.created_at)}</td><td>{row.action}</td><td>{row.target_table}{row.target_id ? ` · ${row.target_id}` : ""}</td><td>{row.actor_user_id || "SYSTEM"}</td><td><code>{JSON.stringify(row.after_value ?? {})}</code></td></tr>)}</tbody></table></div></div>}
    </section>
  </main>;
}
