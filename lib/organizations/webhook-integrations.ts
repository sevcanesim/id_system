import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { getSupabaseAdminClient } from "../supabase/server-admin";

type IntegrationClient = ReturnType<typeof getSupabaseAdminClient>;
const SUPPORTED_EVENTS = ["LEAD_CREATED", "LEAD_STATUS_CHANGED", "MEETING_STATUS_CHANGED"] as const;
export type OrganizationWebhookEvent = (typeof SUPPORTED_EVENTS)[number];

function encryptionKey() {
  const secret = process.env.ORGANIZATION_INTEGRATIONS_ENCRYPTION_KEY?.trim();
  return secret ? createHash("sha256").update(secret).digest() : null;
}

type ResolvedWebhookEndpoint = {
  endpoint: URL;
  address: string;
  family: 4 | 6;
};

function isPrivateIpv4(address: string) {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && (second === 0 || second === 168))
    || (first === 198 && (second === 18 || second === 19 || second === 51))
    || (first === 203 && second === 0)
    || first >= 224;
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("2001:db8")) return true;
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
  const mappedHex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!mappedHex) return false;
  const high = Number.parseInt(mappedHex[1], 16);
  const low = Number.parseInt(mappedHex[2], 16);
  return isPrivateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
}

function isPublicAddress(address: string, family: number) {
  return family === 4 ? !isPrivateIpv4(address) : family === 6 && !isPrivateIpv6(address);
}

function unbracketIpv6(hostname: string) {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

export function validateWebhookEndpoint(value: string) {
  try {
    const url = new URL(value);
    const hostname = unbracketIpv6(url.hostname.toLowerCase());
    const family = isIP(hostname);
    if (
      url.protocol !== "https:"
      || url.username
      || url.password
      || url.port && url.port !== "443"
      || hostname === "localhost"
      || hostname.endsWith(".local")
      || hostname.endsWith(".internal")
      || family !== 0 && !isPublicAddress(hostname, family)
    ) return null;
    return url;
  } catch {
    return null;
  }
}

export async function resolvePublicWebhookEndpoint(value: URL): Promise<ResolvedWebhookEndpoint | null> {
  try {
    const addresses = await lookup(unbracketIpv6(value.hostname), { all: true, verbatim: true });
    if (!addresses.length || addresses.some((candidate) => !isPublicAddress(candidate.address, candidate.family))) return null;
    const resolved = addresses[0];
    return { endpoint: value, address: resolved.address, family: resolved.family as 4 | 6 };
  } catch {
    return null;
  }
}

function webhookFailureCode(error: unknown) {
  if (error instanceof Error && /^WEBHOOK_HTTP_\d{3}$/.test(error.message)) return error.message;
  if (error instanceof Error && error.message === "WEBHOOK_TIMEOUT") return error.message;
  return "WEBHOOK_DELIVERY_FAILED";
}

async function postWebhook(endpoint: ResolvedWebhookEndpoint, body: string, headers: Record<string, string>) {
  await new Promise<void>((resolve, reject) => {
    const request = httpsRequest({
      protocol: "https:",
      hostname: endpoint.endpoint.hostname,
      port: endpoint.endpoint.port || 443,
      path: `${endpoint.endpoint.pathname}${endpoint.endpoint.search}`,
      method: "POST",
      headers,
      servername: endpoint.endpoint.hostname,
      lookup: (_hostname, _options, callback) => callback(null, endpoint.address, endpoint.family),
    }, (response) => {
      response.resume();
      if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
        resolve();
        return;
      }
      reject(new Error(`WEBHOOK_HTTP_${response.statusCode || 0}`));
    });
    request.once("timeout", () => request.destroy(new Error("WEBHOOK_TIMEOUT")));
    request.once("error", reject);
    request.setTimeout(10_000);
    request.end(body);
  });
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
  } catch {}
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
    const parsedEndpoint = integration ? validateWebhookEndpoint(integration.endpoint_url) : null;
    const endpoint = parsedEndpoint ? await resolvePublicWebhookEndpoint(parsedEndpoint) : null;
    const secret = integration ? decrypt(integration.signing_secret_encrypted) : null;
    if (!endpoint || !secret) {
      await admin.from("organization_integration_delivery_jobs").update({ status: "FAILED", last_error: "INTEGRATION_CONFIGURATION_INVALID", updated_at: new Date().toISOString() }).eq("id", job.id);
      failed += 1;
      continue;
    }

    const body = JSON.stringify(job.payload);
    try {
      await postWebhook(endpoint, body, {
          "content-type": "application/json",
          "user-agent": "Yenomi-Integration/1.0",
          "x-yenomi-event": job.event_type,
          "x-yenomi-signature": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
      });
      await admin.from("organization_integration_delivery_jobs").update({ status: "DELIVERED", delivered_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq("id", job.id);
      delivered += 1;
    } catch (error) {
      const attempts = claimed.attempts || job.attempts + 1;
      const terminal = attempts >= 5;
      await admin.from("organization_integration_delivery_jobs").update({
        status: terminal ? "FAILED" : "RETRYABLE",
        next_attempt_at: terminal ? now : retryAt(attempts),
        last_error: webhookFailureCode(error),
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      if (terminal) failed += 1;
      else retried += 1;
    }
  }
  return { inspected: jobs?.length || 0, delivered, retried, failed };
}

export { SUPPORTED_EVENTS };
