"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../../icons";
import { Button, StatusBadge } from "../../../components/ui/DesignSystem";
import { EmptyState, LoadingState } from "../../../components/ui/States";

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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const access = await token();
      if (!access) {
        setError("Denetim kaydı için oturum gerekli.");
        return;
      }
      const response = await fetch(`/api/organizations/audit?organizationId=${encodeURIComponent(organizationId)}`, {
        headers: { authorization: `Bearer ${access}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Denetim kayıtları yüklenemedi.");
        return;
      }
      setEvents(payload.events || []);
      setTotal(payload.summary?.total || 0);
      setLast30Days(payload.summary?.last30Days || 0);
      setMigrationPending(Boolean(payload.migrationPending));
    } catch {
      setError("Denetim kayıtları yüklenirken bağlantı hatası oluştu.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="trust-audit-panel" aria-labelledby="trust-audit-title">
      <header className="trust-audit-panel__header">
        <div>
          <span>GÜVENLİK & DENETİM</span>
          <h2 id="trust-audit-title">Kurumsal işlem kaydı</h2>
          <p>Yönetim işlemleri zaman damgalı olarak kaydedilir. Kayıtlar değiştirilemez ve yalnız yetkili yöneticiler tarafından görüntülenir.</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          <Icon name="refresh" /> Yenile
        </Button>
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
    </section>
  );
}
