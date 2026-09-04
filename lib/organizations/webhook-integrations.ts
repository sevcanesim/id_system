import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { getSupabaseAdminClient } from "../supabase/server-admin";

type IntegrationClient = ReturnType<typeof getSupabaseAdminClient>;
const SUPPORTED_EVENTS = ["LEAD_CREATED", "LEAD_STATUS_CHANGED", "MEETING_STATUS_CHANGED"] as const;
export type OrganizationWebhookEvent = (typeof SUPPORTED_EVENTS)[number];

function encryptionKey() {
  const secret = process.env.ORGANIZATION_INTEGRATIONS_ENCRYPTION_KEY?.trim();
  return secret ? createHash("sha256").update(secret).digest() : null;
}

export function validateWebhookEndpoint(value: string) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const privateIpv4 = /^(127|10)\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    const privateIpv6 = hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd") || hostname.startsWith("fe80:");
    if (url.protocol !== "https:" || url.username || url.password || hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal") || privateIpv4 || privateIpv6) return null;
    return url;
  } catch {
    return null;
  }
}

function encrypt(value: string) {
  const key = encryptionKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  const key = encryptionKey();
  if (!key) return null;
  try {
    const [ivValue, tagValue, cipherValue] = value.split(".");
    if (!ivValue || !tagValue || !cipherValue) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(cipherValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function canConfigureOrganizationWebhooks() {
  return Boolean(encryptionKey());
}

export function createWebhookSigningSecret() {
  const secret = randomBytes(32).toString("base64url");
  const encrypted = encrypt(secret);
  return encrypted ? { secret, encrypted } : null;
}

function safeWebhookPayload(eventType: OrganizationWebhookEvent, payload: Record<string, unknown>) {
  return {
    version: 1,
    event: eventType,
    occurredAt: new Date().toISOString(),
    data: payload,
  };
}

/** Queue delivery only; CRM traffic is dispatched by the cron endpoint so a
 * lead form never blocks on an external provider. */
export async function queueOrganizationWebhookEvent(
  admin: IntegrationClient,
  organizationId: string | null | undefined,
  eventType: OrganizationWebhookEvent,
  payload: Record<string, unknown>,
) {
  if (!organizationId) return;
  try {
    const { data: integrations, error } = await admin
      .from("organization_integrations")
      .select("id,event_types")
      .eq("organization_id", organizationId)
      .eq("provider", "WEBHOOK")
      .eq("status", "ACTIVE");
    if (error || !integrations?.length) return;
    const enabled = integrations.filter((integration) => Array.isArray(integration.event_types) && integration.event_types.includes(eventType));
    if (!enabled.length) return;
    await admin.from("organization_integration_delivery_jobs").insert(enabled.map((integration) => ({
      integration_id: integration.id,
      event_type: eventType,
      payload: safeWebhookPayload(eventType, payload),
    })));
  } catch {
    // The integration migration may not yet be deployed. CRM delivery must
    // never prevent a card visitor from submitting a lead.
  }
}

function retryAt(attempts: number) {
  const minutes = Math.min(360, 2 ** Math.min(attempts, 8));
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export async function deliverOrganizationWebhookJobs(limit = 25) {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data: jobs, error } = await admin
    .from("organization_integration_delivery_jobs")
    .select("id,integration_id,event_type,payload,status,attempts")
    .in("status", ["PENDING", "RETRYABLE"])
    .lte("next_attempt_at", now)
    .order("created_at")
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) throw error;

  let delivered = 0;
  let retried = 0;
  let failed = 0;
  for (const job of jobs || []) {
    const { data: claimed } = await admin
      .from("organization_integration_delivery_jobs")
      .update({ status: "PROCESSING", attempts: job.attempts + 1, updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .in("status", ["PENDING", "RETRYABLE"])
      .select("id,attempts")
      .maybeSingle();
    if (!claimed) continue;

    const { data: integration } = await admin
      .from("organization_integrations")
      .select("endpoint_url,signing_secret_encrypted,status")
      .eq("id", job.integration_id)
      .eq("status", "ACTIVE")
      .maybeSingle();
    const endpoint = integration ? validateWebhookEndpoint(integration.endpoint_url) : null;
    const secret = integration ? decrypt(integration.signing_secret_encrypted) : null;
    if (!endpoint || !secret) {
      await admin.from("organization_integration_delivery_jobs").update({ status: "FAILED", last_error: "INTEGRATION_CONFIGURATION_INVALID", updated_at: new Date().toISOString() }).eq("id", job.id);
      failed += 1;
      continue;
    }

    const body = JSON.stringify(job.payload);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        redirect: "error",
        headers: {
          "content-type": "application/json",
          "user-agent": "Yenomi-Integration/1.0",
          "x-yenomi-event": job.event_type,
          "x-yenomi-signature": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      await admin.from("organization_integration_delivery_jobs").update({ status: "DELIVERED", delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
      delivered += 1;
    } catch (error) {
      const attempts = claimed.attempts || job.attempts + 1;
      const terminal = attempts >= 5;
      await admin.from("organization_integration_delivery_jobs").update({
        status: terminal ? "FAILED" : "RETRYABLE",
        next_attempt_at: terminal ? now : retryAt(attempts),
        last_error: error instanceof Error ? error.message.slice(0, 180) : "WEBHOOK_DELIVERY_FAILED",
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      if (terminal) failed += 1;
      else retried += 1;
    }
  }
  return { inspected: jobs?.length || 0, delivered, retried, failed };
}

export { SUPPORTED_EVENTS };
