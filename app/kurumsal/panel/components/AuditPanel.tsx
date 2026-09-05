"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../../icons";
import { Button, StatusBadge } from "../../../components/ui/DesignSystem";
import { EmptyState, LoadingState } from "../../../components/ui/States";
import { createExcelCsv } from "../../../../lib/csv";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";

type AuditEvent = {
  id: string;
  actor_name: string;
  actor_role: "OWNER" | "ADMIN" | "HR" | "SYSTEM";
  action: string;
  summary: string;
  occurred_at: string;
};

type Props = {
  organizationId: string;
  token: () => Promise<string | null>;
};

type SecurityState = {
  requireMfaForCriticalActions: boolean;
  migrationPending: boolean;
  canManagePolicy: boolean;
  assuranceLevel: "aal1" | "aal2" | null;
};

type Enrollment = { factorId: string; qrCode: string; secret: string } | null;

const roleLabel: Record<AuditEvent["actor_role"], string> = {
  OWNER: "Şirket Sahibi",
  ADMIN: "Yönetici",
  HR: "İK Yöneticisi",
  SYSTEM: "Sistem",
};

function actionTone(action: string): "success" | "warning" | "info" | "neutral" {
  if (action.includes("STATUS") || action.includes("REMOVED")) return "warning";
  if (action.includes("INVITED") || action.includes("PUBLICATION")) return "success";
  if (action.includes("ROLE") || action.includes("ROLLBACK")) return "info";
  return "neutral";
}

function actionIcon(action: string) {
  if (action.includes("MEMBER")) return "users";
  if (action.includes("CONTENT")) return "link";
  if (action.includes("SECURITY")) return "secure";
  return "shield";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AuditPanel({ organizationId, token }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [last30Days, setLast30Days] = useState(0);
  const [loading, setLoading] = useState(true);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState("");
  const [security, setSecurity] = useState<SecurityState | null>(null);
  const [securityError, setSecurityError] = useState("");
  const [securityBusy, setSecurityBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<Enrollment>(null);
  const [verificationCode, setVerificationCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const access = await token();
      if (!access) {
        setError("Denetim kaydı için oturum gerekli.");
        return;
      }
      const [response, securityResponse] = await Promise.all([
        fetch(`/api/organizations/audit?organizationId=${encodeURIComponent(organizationId)}`, {
          headers: { authorization: `Bearer ${access}` }, cache: "no-store",
        }),
        fetch(`/api/organizations/security?organizationId=${encodeURIComponent(organizationId)}`, {
          headers: { authorization: `Bearer ${access}` }, cache: "no-store",
        }),
      ]);
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Denetim kayıtları yüklenemedi.");
        return;
      }
      setEvents(payload.events || []);
      setTotal(payload.summary?.total || 0);
      setLast30Days(payload.summary?.last30Days || 0);
      setMigrationPending(Boolean(payload.migrationPending));
      if (securityResponse.ok) {
        const securityPayload = await securityResponse.json();
        setSecurity({
          requireMfaForCriticalActions: Boolean(securityPayload.policy?.requireMfaForCriticalActions),
          migrationPending: Boolean(securityPayload.migrationPending),
          canManagePolicy: Boolean(securityPayload.permissions?.canManagePolicy),
          assuranceLevel: securityPayload.session?.assuranceLevel === "aal2" ? "aal2" : securityPayload.session?.assuranceLevel === "aal1" ? "aal1" : null,
        });
        setSecurityError("");
      } else {
        setSecurityError("MFA politikası şu anda yüklenemedi.");
      }
    } catch {
      setError("Denetim kayıtları yüklenirken bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, token]);

  useEffect(() => { void load(); }, [load]);

  function downloadCsv() {
    const rows = [
      ["Tarih", "İşlem", "Açıklama", "Yapan", "Rol"],
      ...events.map((event) => [formatDate(event.occurred_at), event.action, event.summary, event.actor_name, roleLabel[event.actor_role]]),
    ];
    const blob = new Blob([createExcelCsv(rows)], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `yenomi-denetim-kaydi-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function startMfaEnrollment() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setSecurityError("MFA kurulumu için oturum gerekli."); return; }
    setSecurityBusy(true);
    setSecurityError("");
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Yenomi Business" });
    if (enrollError || !data?.totp) setSecurityError("Authenticator kurulumu başlatılamadı. Lütfen yeniden deneyin.");
    else setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setSecurityBusy(false);
  }

  async function verifyMfa() {
    const supabase = getSupabaseBrowserClient();
    const code = verificationCode.replace(/\s/g, "");
    if (!supabase || !enrollment) return;
    if (!/^\d{6}$/.test(code)) { setSecurityError("Authenticator uygulamasındaki 6 haneli kodu girin."); return; }
    setSecurityBusy(true);
    setSecurityError("");
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollment.factorId });
    if (challengeError || !challenge) setSecurityError("Doğrulama başlatılamadı. Yeni kodla tekrar deneyin.");
    else {
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: enrollment.factorId, challengeId: challenge.id, code });
      if (verifyError) setSecurityError("Kod doğrulanamadı. Güncel kodu kontrol edin.");
      else {
        setEnrollment(null);
        setVerificationCode("");
        await load();
      }
    }
    setSecurityBusy(false);
  }

  async function updatePolicy(enabled: boolean) {
    const access = await token();
    if (!access) { setSecurityError("Güvenlik ayarını değiştirmek için oturum gerekli."); return; }
    setSecurityBusy(true);
    setSecurityError("");
    const response = await fetch("/api/organizations/security", {
      method: "PATCH",
      headers: { authorization: `Bearer ${access}`, "content-type": "application/json" },
      body: JSON.stringify({ organizationId, requireMfaForCriticalActions: enabled }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setSecurityError(payload?.error || "MFA politikası kaydedilemedi.");
    } else await load();
    setSecurityBusy(false);
  }

  return (
    <section className="trust-audit-panel" aria-labelledby="trust-audit-title">
      <header className="trust-audit-panel__header">
        <div>
          <span>GÜVENLİK & DENETİM</span>
          <h2 id="trust-audit-title">Kurumsal işlem kaydı</h2>
          <p>Yönetim işlemleri zaman damgalı olarak kaydedilir. Kayıtlar değiştirilemez ve yalnız yetkili yöneticiler tarafından görüntülenir.</p>
        </div>
        <div className="trust-audit-panel__actions">
          <Button type="button" variant="secondary" size="sm" onClick={downloadCsv} disabled={loading || events.length === 0}>CSV indir</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => window.print()} disabled={loading || events.length === 0}>Yazdır / PDF</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()} disabled={loading}><Icon name="refresh" /> Yenile</Button>
        </div>
      </header>

      <div className="trust-audit-panel__summary" aria-label="Denetim özeti">
        <article><Icon name="shield" /><div><small>Kayıt bütünlüğü</small><strong>Korunuyor</strong><span>Değiştirilemez kayıt</span></div></article>
        <article><Icon name="clock" /><div><small>Son 30 gün</small><strong>{last30Days}</strong><span>Yönetim işlemi</span></div></article>
        <article><Icon name="analytics" /><div><small>Görüntülenen kayıt</small><strong>{total}</strong><span>Son 50 işlem</span></div></article>
      </div>

      {loading ? <LoadingState variant="compact" label="Denetim kayıtları yükleniyor" /> : null}
      {!loading && error ? <EmptyState compact icon="alert" title="Kayıtlar yüklenemedi" description={error} action={<Button type="button" variant="secondary" size="sm" onClick={() => void load()}>Yeniden dene</Button>} /> : null}
      {!loading && !error && migrationPending ? <EmptyState compact icon="shield" title="Denetim altyapısı bekliyor" description="Bu özellik dalındaki veritabanı migration’ı henüz bu ortama uygulanmadı. Uygulandığında yeni işlemler burada görünür." /> : null}
      {!loading && !error && !migrationPending && events.length === 0 ? <EmptyState compact icon="shield" title="Henüz denetim kaydı yok" description="Davet, rol, çalışan durumu ve kurumsal içerik işlemleri burada görünür." /> : null}
      {!loading && !error && !migrationPending && events.length > 0 ? (
        <ol className="trust-audit-panel__timeline">
          {events.map((event) => (
            <li key={event.id}>
              <span className="trust-audit-panel__event-icon"><Icon name={actionIcon(event.action)} /></span>
              <div className="trust-audit-panel__event-copy"><strong>{event.summary}</strong><small>{event.actor_name} · {formatDate(event.occurred_at)}</small></div>
              <StatusBadge tone={actionTone(event.action)}>{roleLabel[event.actor_role]}</StatusBadge>
            </li>
          ))}
        </ol>
      ) : null}

      <section className="trust-mfa-card" aria-labelledby="trust-mfa-title">
        <div className="trust-mfa-card__copy">
          <span><Icon name="secure" /> KRİTİK İŞLEM KORUMASI</span>
          <h3 id="trust-mfa-title">Yönetici MFA politikası</h3>
          <p>Etkinleştirildiğinde davet, rol, çalışan durumu, sahiplik devri ve kurumsal içerik işlemleri ek doğrulama olmadan tamamlanamaz.</p>
        </div>
        <div className="trust-mfa-card__status">
          <StatusBadge tone={security?.requireMfaForCriticalActions ? "success" : "neutral"}>{security?.requireMfaForCriticalActions ? "Kritik işlemlerde MFA aktif" : "Politika kapalı"}</StatusBadge>
          <small>Oturum seviyesi: {security?.assuranceLevel === "aal2" ? "MFA doğrulandı" : "Temel doğrulama"}</small>
        </div>
        {security?.migrationPending ? <p className="trust-mfa-card__notice">Bu politika için migration henüz hedef veritabanına uygulanmadı.</p> : null}
        {securityError ? <p className="trust-mfa-card__notice" role="status">{securityError}</p> : null}
        {!security?.migrationPending && security?.assuranceLevel !== "aal2" && !enrollment ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => void startMfaEnrollment()} disabled={securityBusy}><Icon name="secure" /> Authenticator kur</Button>
        ) : null}
        {enrollment ? <div className="trust-mfa-card__enrollment">
          <img src={enrollment.qrCode} alt="Authenticator kurulum QR kodu" width={148} height={148} />
          <div><strong>QR kodu Authenticator uygulamasıyla tarayın</strong><p>Tarayamazsanız kurulum anahtarı: <code>{enrollment.secret}</code></p><label>6 haneli kod<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></label><Button type="button" size="sm" onClick={() => void verifyMfa()} disabled={securityBusy}>Doğrula</Button></div>
        </div> : null}
        {security?.canManagePolicy && !security?.migrationPending ? <label className="trust-mfa-card__toggle"><input type="checkbox" checked={security.requireMfaForCriticalActions} onChange={(event) => void updatePolicy(event.target.checked)} disabled={securityBusy || security.assuranceLevel !== "aal2"} /><span>Bu şirket için kritik işlemlerde MFA zorunlu</span></label> : null}
      </section>
    </section>
  );
}
