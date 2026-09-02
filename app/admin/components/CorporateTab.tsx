import { FormEvent } from "react";
import { networkMailGrant } from "../../../lib/commerce/packages";
import type { AttachManagerForm, BusinessPlan, CorporateAccount, CorporateForm } from "../domain/types";
import styles from "../AdminSales.module.css";

/**
 * "Kurumsal Hesaplar" sekmesi. app/admin/page.tsx'ten çıkarıldı; davranış
 * birebir korunur — tüm state ve veri yükleme parent'ta kalır.
 */
export default function CorporateTab({
  form, setForm, plans, selectedPlan, provisioning, corporateMessage, onProvision,
  accounts, corporateLoading, attachForm, setAttachForm, onAttachManager, onSetOrganizationStatus,
}: {
  form: CorporateForm;
  setForm: (updater: (current: CorporateForm) => CorporateForm) => void;
  plans: BusinessPlan[];
  selectedPlan: BusinessPlan | undefined;
  provisioning: boolean;
  corporateMessage: string;
  onProvision: (event: FormEvent) => void;
  accounts: CorporateAccount[];
  corporateLoading: boolean;
  attachForm: Record<string, AttachManagerForm>;
  setAttachForm: (updater: (current: Record<string, AttachManagerForm>) => Record<string, AttachManagerForm>) => void;
  onAttachManager: (organizationId: string) => void;
  onSetOrganizationStatus: (organizationId: string, status: "ACTIVE" | "SUSPENDED") => void;
}) {
  return <div className={styles.split}>
    <form className={styles.panel} onSubmit={onProvision}>
      <h2>Yeni şirket oluştur</h2>
      <label className={styles.field}><span>Şirket adı</span><input required value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label>
      <div className={styles.twoCol}><label className={styles.field}><span>Vergi numarası</span><input required value={form.taxNumber} onChange={(e) => setForm((v) => ({ ...v, taxNumber: e.target.value }))} /></label><label className={styles.field}><span>Vergi dairesi</span><input value={form.taxOffice} onChange={(e) => setForm((v) => ({ ...v, taxOffice: e.target.value }))} /></label></div>
      <label className={styles.field}><span>Yasal adres</span><input value={form.legalAddress} onChange={(e) => setForm((v) => ({ ...v, legalAddress: e.target.value }))} /></label>
      <div className={styles.twoCol}><label className={styles.field}><span>Şehir</span><input value={form.city} onChange={(e) => setForm((v) => ({ ...v, city: e.target.value }))} /></label><label className={styles.field}><span>Paket</span><select value={form.planCode} onChange={(e) => setForm((v) => ({ ...v, planCode: e.target.value }))}>{plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name}</option>)}</select></label></div>
      <div className={styles.twoCol}><label className={styles.field}><span>Çalışan limiti</span><input type="number" min={1} value={form.employeeLimit} onChange={(e) => setForm((v) => ({ ...v, employeeLimit: e.target.value }))} placeholder={selectedPlan?.seat_limit ? String(selectedPlan.seat_limit) : "Zorunlu"} /></label><label className={styles.field}><span>Mail kredisi</span><input type="number" min={0} value={form.mailCreditLimit} onChange={(e) => setForm((v) => ({ ...v, mailCreditLimit: e.target.value }))} placeholder={selectedPlan?.seat_limit ? String(networkMailGrant(selectedPlan.seat_limit)) : "Kişi başı 100"} /></label></div>
      <button className={`${styles.button} ${styles.buttonPrimary}`} disabled={provisioning}>{provisioning ? "Oluşturuluyor…" : "Şirketi oluştur"}</button>
      {corporateMessage && <div className={styles.message}>{corporateMessage}</div>}
    </form>
    <div className={styles.panel}>
      <h2>Mevcut şirketler</h2>
      {corporateLoading ? <div className={styles.empty}>Kurumsal hesaplar yükleniyor…</div> : <div className={styles.list}>{accounts.map((account) => { const attach = attachForm[account.id] || { email: "", fullName: "", role: "OWNER" as const }; return <article className={styles.compactRow} key={account.id}><div className={styles.compactHead}><div><strong>{account.name}</strong><div className={styles.subtle}>{account.corporateId || "Corporate ID bekleniyor"} · VKN {account.taxNumber || "—"}</div></div><button className={styles.button} type="button" onClick={() => onSetOrganizationStatus(account.id, account.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>{account.status === "ACTIVE" ? "Pasife al" : "Aktifleştir"}</button></div><div className={styles.compactMeta}><div className={styles.detail}><small>Kapasite</small><strong>{account.entitlements ? `${account.usedSeats}/${account.entitlements.employee_limit}` : `${account.usedSeats}/${account.subscription?.seat_limit ?? "—"}`}</strong></div><div className={styles.detail}><small>Network Mail</small><strong>{account.entitlements ? `${account.entitlements.mail_credits_remaining}/${account.entitlements.mail_credit_limit}` : "—"}</strong></div><div className={styles.detail}><small>Yönetici</small><strong>{account.managers.length || 0}</strong></div></div><div className={styles.twoCol}><label className={styles.field}><span>Yönetici e-posta</span><input type="email" value={attach.email} onChange={(e) => setAttachForm((c) => ({ ...c, [account.id]: { ...attach, email: e.target.value } }))} /></label><label className={styles.field}><span>Ad soyad</span><input value={attach.fullName} onChange={(e) => setAttachForm((c) => ({ ...c, [account.id]: { ...attach, fullName: e.target.value } }))} /></label></div><div className={styles.actions}><select value={attach.role} onChange={(e) => setAttachForm((c) => ({ ...c, [account.id]: { ...attach, role: e.target.value as "OWNER" | "ADMIN" | "HR" } }))}><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="HR">HR</option></select><button className={styles.button} type="button" onClick={() => onAttachManager(account.id)} disabled={provisioning}>Kullanıcıyı bağla</button></div></article>; })}</div>}
    </div>
  </div>;
}
