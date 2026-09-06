"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, StatusBadge } from "../../../components/ui/DesignSystem";
import { EmptyState, LoadingState } from "../../../components/ui/States";
import { Icon } from "../../../icons";

type Integration = {
  id: string;
  provider: "WEBHOOK";
  status: "ACTIVE" | "DISABLED";
  endpointHost: string;
  eventTypes: string[];
  updatedAt: string;
};

export default function IntegrationsPanel({ organizationId, token }: { organizationId: string; token: () => Promise<boolean> }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [endpointUrl, setEndpointUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [webhookReady, setWebhookReady] = useState(false);
  const [message, setMessage] = useState("");
  const [signingSecret, setSigningSecret] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    if (!(await token())) { setMessage("Entegrasyonları görüntülemek için oturum gerekli."); setLoading(false); return; }
    try {
      const response = await fetch(`/api/organizations/integrations?organizationId=${encodeURIComponent(organizationId)}`, { credentials: "same-origin", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) { setMessage(payload.error || "Entegrasyonlar yüklenemedi."); return; }
      setIntegrations(payload.integrations || []);
      setMigrationPending(Boolean(payload.migrationPending));
      setWebhookReady(Boolean(payload.webhookReady));
    } catch { setMessage("Entegrasyonlar yüklenirken bağlantı hatası oluştu."); }
    finally { setLoading(false); }
  }, [organizationId, token]);

  useEffect(() => { void load(); }, [load]);

  async function saveWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await token())) return;
    setBusy(true); setMessage(""); setSigningSecret("");
    try {
      const response = await fetch("/api/organizations/integrations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action: "CONFIGURE_WEBHOOK", organizationId, endpointUrl, eventTypes: ["LEAD_CREATED", "LEAD_STATUS_CHANGED", "MEETING_STATUS_CHANGED"] }),
      });
      const payload = await response.json();
      if (!response.ok) { setMessage(payload.error || "Webhook kaydedilemedi."); return; }
      setSigningSecret(payload.signingSecret || "");
      setEndpointUrl("");
      setMessage("Webhook etkinleştirildi. İmzalama anahtarını şimdi CRM ekibinizle güvenli şekilde paylaşın.");
      await load();
    } catch { setMessage("Webhook kaydedilemedi."); }
    finally { setBusy(false); }
  }

  async function disableWebhook() {
    if (!(await token()) || !window.confirm("Webhook teslimatlarını durdurmak istediğinize emin misiniz?")) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/organizations/integrations", { method: "DELETE", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: "DISABLE_WEBHOOK", organizationId }) });
      const payload = await response.json();
      setMessage(response.ok ? "Webhook devre dışı bırakıldı." : payload.error || "Webhook kapatılamadı.");
      if (response.ok) await load();
    } finally { setBusy(false); }
  }

  const activeWebhook = integrations.find((item) => item.provider === "WEBHOOK" && item.status === "ACTIVE");

  return <section className="integration-panel" aria-labelledby="integration-title">
    <header className="integration-panel__header"><div><span>ENTEGRASYON MERKEZİ</span><h2 id="integration-title">CRM’e akan gerçek networking</h2><p>Yeni lead, lead durumu ve görüşme güncellemelerini CRM’inize imzalı webhook ile güvenli biçimde aktarın.</p></div><Button type="button" variant="secondary" size="sm" onClick={() => void load()} disabled={loading}><Icon name="refresh" /> Yenile</Button></header>

    <div className="integration-panel__benefits"><article><Icon name="users" /><div><strong>Lead senkronu</strong><small>Yeni kart bağlantıları CRM’e düşer.</small></div></article><article><Icon name="secure" /><div><strong>HMAC imzası</strong><small>Her teslimat doğrulanabilir.</small></div></article><article><Icon name="clock" /><div><strong>Tekrar deneme</strong><small>Başarısız teslimatlar 5 kez yeniden denenir.</small></div></article></div>

    {loading ? <LoadingState variant="compact" label="Entegrasyonlar yükleniyor" /> : null}
    {!loading && migrationPending ? <EmptyState compact icon="link" title="Entegrasyon altyapısı bekliyor" description="Bu özellik dalındaki veritabanı migration’ı hedef ortama uygulanınca CRM bağlantısı etkinleşir." /> : null}
    {!loading && !migrationPending && !webhookReady ? <EmptyState compact icon="secure" title="Sunucu şifreleme anahtarı gerekli" description="Webhook imzalama anahtarını güvenle saklamak için ORGANIZATION_INTEGRATIONS_ENCRYPTION_KEY yapılandırılmalıdır. Bu olmadan bağlantı etkinleştirilmez." /> : null}
    {!loading && !migrationPending && webhookReady && activeWebhook ? <section className="integration-panel__active"><div><StatusBadge tone="success">Webhook aktif</StatusBadge><strong>{activeWebhook.endpointHost}</strong><small>{activeWebhook.eventTypes.length} olay türü dinleniyor · Anahtar güvenlik nedeniyle yeniden görüntülenemez.</small></div><Button type="button" variant="secondary" size="sm" onClick={() => void disableWebhook()} disabled={busy}>Devre dışı bırak</Button></section> : null}
    {!loading && !migrationPending && webhookReady && !activeWebhook ? <form className="integration-panel__form" onSubmit={(event) => void saveWebhook(event)}><div><label htmlFor="crm-webhook-url">CRM webhook adresi</label><input id="crm-webhook-url" type="url" required placeholder="https://crm.orneginiz.com/webhooks/yenomi" value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} /><small>HubSpot, Pipedrive, Salesforce, Make veya Zapier’de oluşturduğunuz HTTPS endpoint’i kullanın.</small></div><Button type="submit" size="sm" disabled={busy}>{busy ? "Kaydediliyor…" : "Webhook’u etkinleştir"}</Button></form> : null}
    {signingSecret ? <section className="integration-panel__secret"><Icon name="secure" /><div><strong>Webhook imzalama anahtarı — yalnız bu kez gösterilir</strong><code>{signingSecret}</code><small>Gönderilen gövdeler <code>x-yenomi-signature: sha256=…</code> başlığıyla imzalanır. Anahtarı CRM tarafında güvenli değişken olarak saklayın.</small></div></section> : null}
    {message ? <p className="integration-panel__message" role="status">{message}</p> : null}
  </section>;
}
