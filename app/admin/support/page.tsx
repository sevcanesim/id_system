"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import styles from "../AdminSales.module.css";

type SupportRecord = { account: { yenomi_id: string; email: string; display_name: string | null; status: string; package_code: string }; grants: Array<{ id: string; grant_reason: string; term_mode: string; renewal_policy: string; status: string; expires_at: string | null; network_mail_remaining: number; network_mail_limit: number }>; orders: Array<{ id: string; order_number: string; status: string; total_kurus: number; currency: string; created_at: string }>; invoices: Array<{ id: string; order_id: string; provider: string; status: string; provider_invoice_id: string | null }>; payments: Array<{ id: string; order_id: string; provider: string; status: string; error_code: string | null }>; systemErrors: Array<{ id: string; request_id: string | null; source: string; error_code: string | null; message: string; occurred_at: string }> };

function date(value: string | null) { return value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value)) : "Süresiz"; }

export default function AdminSupportPage() {
  const [yenomiId, setYenomiId] = useState("");
  const [record, setRecord] = useState<SupportRecord | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [termMode, setTermMode] = useState<"PERPETUAL" | "FIXED_TERM">("PERPETUAL");
  const [renewalPolicy, setRenewalPolicy] = useState<"NONE" | "PAID_RENEWAL" | "MANUAL_RENEWAL">("PAID_RENEWAL");
  const [expiresAt, setExpiresAt] = useState("");
  const [displayName, setDisplayName] = useState("");

  async function token() { const client = getSupabaseBrowserClient(); if (!client) return ""; const { data } = await client.auth.getSession(); return data.session?.access_token || ""; }
  async function search(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const response = await fetch(`/api/admin/support?yenomiId=${encodeURIComponent(yenomiId.trim())}`, { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" }); const body = await response.json(); if (!response.ok) { setRecord(null); setMessage(body.error || "Kayıt okunamadı."); } else { setRecord(body); setDisplayName(body.account.display_name || ""); } }
    catch { setMessage("Sunucuya ulaşılamadı."); } finally { setBusy(false); }
  }
  async function updateAccount() {
    if (!record) return; setBusy(true); setMessage("");
    try { const response = await fetch("/api/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ action: "update_user_account", yenomiId: record.account.yenomi_id, displayName, status: record.account.status }) }); const body = await response.json(); setMessage(response.ok ? "Kullanıcı bilgisi güncellendi ve denetim kaydına işlendi." : (body.error || "Kullanıcı bilgisi güncellenemedi.")); if (response.ok) await search(new Event("submit") as unknown as FormEvent); }
    catch { setMessage("Kullanıcı bilgisi güncellenirken sunucuya ulaşılamadı."); } finally { setBusy(false); }
  }
  async function grant() {
    if (!record) return; setBusy(true); setMessage("");
    try { const response = await fetch("/api/admin/support", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ action: "grant_individual_premium", yenomiId: record.account.yenomi_id, grantReason: "ADVERTISING", termMode, renewalPolicy, expiresAt: termMode === "FIXED_TERM" && expiresAt ? new Date(`${expiresAt}T23:59:59.999Z`).toISOString() : null, networkMailLimit: 0 }) }); const body = await response.json(); setMessage(response.ok ? "Premium tahsisi kaydedildi. Network Mail kredisi bu tahsiste 0 olarak başladı." : (body.error || "Tahsis kaydedilemedi.")); if (response.ok) await search(new Event("submit") as unknown as FormEvent); }
    catch { setMessage("Tahsis kaydedilirken sunucuya ulaşılamadı."); } finally { setBusy(false); }
  }

  return <main className={styles.page}><section className={styles.shell}>
    <div className={styles.heading}><div><span className={styles.kicker}>MÜŞTERİ DESTEK KAYDI</span><h1>Yenomi ID ile bütün operasyon geçmişine ulaş.</h1><p>Satış ve fatura verisi ile yönetici tahsisleri ayrıdır. Her değişiklik denetim kaydına girer.</p></div></div>
    <form className={styles.panel} onSubmit={search}><h2>Yenomi ID ara</h2><div className={styles.actions}><label className={styles.field}><span>12 haneli Yenomi ID</span><input value={yenomiId} onChange={(event) => setYenomiId(event.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" placeholder="260905100001" required /></label><button className={`${styles.button} ${styles.buttonPrimary}`} disabled={busy}>{busy ? "Aranıyor…" : "Kaydı aç"}</button></div></form>
    {message && <p className={styles.message} role="status">{message}</p>}
    {record && <div className={styles.split}>
      <section className={styles.panel}><h2>{record.account.display_name || "İsimsiz kullanıcı"}</h2><p className={styles.subtle}>{record.account.yenomi_id} · {record.account.email} · {record.account.status}</p><label className={styles.field}><span>Görünen ad</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={160} /></label><button type="button" className={styles.button} disabled={busy} onClick={() => void updateAccount()}>Kullanıcı bilgisini güncelle</button><h3>Premium tahsisi</h3><div className={styles.twoCol}><label className={styles.field}><span>Süre</span><select value={termMode} onChange={(event) => setTermMode(event.target.value as typeof termMode)}><option value="PERPETUAL">Süresiz ücretsiz</option><option value="FIXED_TERM">Süreli ücretsiz</option></select></label><label className={styles.field}><span>Sonraki dönem</span><select value={renewalPolicy} onChange={(event) => setRenewalPolicy(event.target.value as typeof renewalPolicy)}><option value="PAID_RENEWAL">Ücretli yenileme</option><option value="MANUAL_RENEWAL">Manuel karar</option><option value="NONE">Yenileme yok</option></select></label></div>{termMode === "FIXED_TERM" && <label className={styles.field}><span>Bitiş tarihi</span><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} required /></label>}<button type="button" className={`${styles.button} ${styles.buttonPrimary}`} disabled={busy || (termMode === "FIXED_TERM" && !expiresAt)} onClick={() => void grant()}>Reklam Premium’u tanımla</button><h3>Mevcut tahsisler</h3>{record.grants.map((grant) => <p className={styles.subtle} key={grant.id}>{grant.grant_reason} · {grant.status} · {date(grant.expires_at)} · Mail {grant.network_mail_remaining}/{grant.network_mail_limit}</p>)}</section>
      <section className={styles.panel}><h2>Sipariş, fatura ve hata geçmişi</h2><h3>Siparişler</h3>{record.orders.length ? record.orders.map((order) => <p className={styles.subtle} key={order.id}>{order.order_number} · {order.status} · {date(order.created_at)}</p>) : <p className={styles.subtle}>Sipariş kaydı yok.</p>}<h3>Faturalar</h3>{record.invoices.length ? record.invoices.map((invoice) => <p className={styles.subtle} key={invoice.id}>{invoice.provider} · {invoice.status} · {invoice.provider_invoice_id || "Referans bekliyor"}</p>) : <p className={styles.subtle}>Fatura işi yok.</p>}<h3>Sistem logları</h3>{record.systemErrors.length ? record.systemErrors.map((entry) => <p className={styles.subtle} key={entry.id}>{date(entry.occurred_at)} · {entry.source} · {entry.error_code || "GENEL"} · {entry.request_id || "referans yok"}</p>) : <p className={styles.subtle}>Bu kullanıcıyla ilişkili kaydedilmiş hata yok.</p>}</section>
    </div>}
  </section></main>;
}
