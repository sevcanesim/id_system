import { money } from "../../../lib/admin/order-classification";
import type { ReconciliationRow, ReconciliationSummary } from "../domain/types";
import styles from "../AdminSales.module.css";

/**
 * "Ödeme Mutabakatı" sekmesi. app/admin/page.tsx'ten çıkarıldı; davranış
 * birebir korunur — tüm state ve veri yükleme parent'ta kalır.
 */
export default function ReconciliationTab({
  summary, rows, message, loading, reconcilingPaid,
  resolutionNotes, setResolutionNotes, resolvingIssue,
  onReload, onRunPaidReconciliation, onResolveIssue,
}: {
  summary: ReconciliationSummary;
  rows: ReconciliationRow[];
  message: string;
  loading: boolean;
  reconcilingPaid: boolean;
  resolutionNotes: Record<string, string>;
  setResolutionNotes: (updater: (current: Record<string, string>) => Record<string, string>) => void;
  resolvingIssue: string | null;
  onReload: () => void;
  onRunPaidReconciliation: () => void;
  onResolveIssue: (issueId: string) => void;
}) {
  return <>
    <div className={styles.stats}><div className={styles.stat}><small>Kontrol edilen</small><strong>{summary.checkedOrders}</strong></div><div className={styles.stat}><small>İnceleme gerekiyor</small><strong>{summary.requiresReview}</strong></div><div className={styles.stat}><small>Açık fulfillment</small><strong>{summary.openFulfillmentIssues}</strong></div><div className={styles.stat}><small>Yetim PAID attempt</small><strong>{summary.orphanPaidAttempts}</strong></div></div>
    <div className={styles.panel}>
      <div className={styles.compactHead}><div><h2>Ödeme → sipariş → entitlement mutabakatı</h2><p className={styles.subtle}>Ödeme başarı durumunu fulfillment sorunundan ayrı incele.</p></div><div className={styles.actions}><button type="button" className={styles.button} onClick={onReload} disabled={loading}>Yeniden kontrol et</button><button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={onRunPaidReconciliation} disabled={reconcilingPaid}>Ödenmişleri onar</button></div></div>
      {message && <div className={styles.message}>{message}</div>}
      <div className={styles.list}>{rows.filter((row) => row.requiresReview).length === 0 ? <div className={styles.empty}>Açık mutabakat sorunu yok.</div> : rows.filter((row) => row.requiresReview).map((row) => <article className={styles.compactRow} key={row.id}><div className={styles.compactHead}><div><strong>{row.order_number}</strong><div className={styles.subtle}>{row.guest_email} · {money(row.total_kurus)} {row.currency}</div></div><span className={`${styles.pill} ${styles.pillDanger}`}>İNCELEME</span></div><div className={styles.compactMeta}><div className={styles.detail}><small>Sipariş</small><strong>{row.status}</strong></div><div className={styles.detail}><small>Payment attempt</small><strong>{row.paymentAttempts[0]?.status ?? "YOK"}</strong></div><div className={styles.detail}><small>Aktivasyon</small><strong>{row.activation_claimed_at ? "Tamamlandı" : "Bekliyor"}</strong></div></div>{row.fulfillmentIssues.filter((issue) => !issue.resolved_at).map((issue) => <div className={styles.twoCol} key={issue.id}><label className={styles.field}><span>{issue.issue_code} — çözüm notu</span><input value={resolutionNotes[issue.id] ?? ""} onChange={(e) => setResolutionNotes((current) => ({ ...current, [issue.id]: e.target.value }))} /></label><button className={styles.button} type="button" onClick={() => onResolveIssue(issue.id)} disabled={resolvingIssue === issue.id}>Çözüldü olarak işaretle</button></div>)}</article>)}</div>
    </div>
  </>;
}
