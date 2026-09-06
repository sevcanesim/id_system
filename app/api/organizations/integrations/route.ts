import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganizationRole } from "../../../../lib/organizations/authorization";
import {
  canConfigureOrganizationWebhooks,
  createWebhookSigningSecret,
  SUPPORTED_EVENTS,
  resolvePublicWebhookEndpoint,
  validateWebhookEndpoint,
} from "../../../../lib/organizations/webhook-integrations";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

const eventTypeSchema = z.enum(SUPPORTED_EVENTS);
const configureSchema = z.object({
  action: z.literal("CONFIGURE_WEBHOOK"),
  organizationId: z.string().uuid(),
  endpointUrl: z.string().trim().url().max(500),
  eventTypes: z.array(eventTypeSchema).min(1).max(SUPPORTED_EVENTS.length),
});
const disableSchema = z.object({ action: z.literal("DISABLE_WEBHOOK"), organizationId: z.string().uuid() });

function endpointHost(value: string) {
  try { return new URL(value).host; } catch { return "—"; }
}

export async function GET(request: NextRequest) {
  const organizationId = request.nextUrl.searchParams.get("organizationId") || "";
  const actor = await requireOrganizationRole(request, organizationId, ["OWNER", "ADMIN"]);
  if (!actor) return NextResponse.json({ error: "Entegrasyonları görme yetkin yok." }, { status: 403 });
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("organization_integrations")
    .select("id,provider,status,endpoint_url,event_types,updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) {
    const migrationPending = error.code === "42P01" || error.code === "PGRST205";
    return NextResponse.json(
      { integrations: [], migrationPending, webhookReady: canConfigureOrganizationWebhooks(), error: migrationPending ? undefined : "Entegrasyonlar yüklenemedi." },
      { status: migrationPending ? 200 : 500 },
    );
  }
  return NextResponse.json({
    integrations: (data || []).map((integration) => ({
      id: integration.id,
      provider: integration.provider,
      status: integration.status,
      endpointHost: endpointHost(integration.endpoint_url),
      eventTypes: integration.event_types || [],
      updatedAt: integration.updated_at,
    })),
    migrationPending: false,
    webhookReady: canConfigureOrganizationWebhooks(),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = configureSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Webhook ayarlarını kontrol edin." }, { status: 400 });
  const actor = await requireOrganizationRole(request, parsed.data.organizationId, ["OWNER", "ADMIN"]);
  if (!actor) return NextResponse.json({ error: "Webhook entegrasyonunu yönetme yetkin yok." }, { status: 403 });
  const parsedEndpoint = validateWebhookEndpoint(parsed.data.endpointUrl);
  const endpoint = parsedEndpoint ? await resolvePublicWebhookEndpoint(parsedEndpoint) : null;
  if (!endpoint) return NextResponse.json({ error: "Yalnız HTTPS ve herkese açık bir webhook adresi kullanılabilir." }, { status: 400 });
  const secret = createWebhookSigningSecret();
  if (!secret) return NextResponse.json({ error: "Sunucuda ORGANIZATION_INTEGRATIONS_ENCRYPTION_KEY yapılandırılmadan webhook etkinleştirilemez.", code: "INTEGRATION_ENCRYPTION_UNCONFIGURED" }, { status: 409 });

  const admin = getSupabaseAdminClient();
  const { error } = await admin.from("organization_integrations").upsert({
    organization_id: parsed.data.organizationId,
    provider: "WEBHOOK",
    status: "ACTIVE",
    endpoint_url: endpoint.endpoint.toString(),
    signing_secret_encrypted: secret.encrypted,
    event_types: parsed.data.eventTypes,
    created_by: actor.userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "organization_id,provider" });
  if (error) {
    const migrationPending = error.code === "42P01" || error.code === "PGRST205";
    return NextResponse.json({ error: migrationPending ? "Entegrasyon migration’ı henüz uygulanmadı." : "Webhook kaydedilemedi.", migrationPending }, { status: migrationPending ? 409 : 500 });
  }
  // The secret is intentionally returned exactly once and never stored in a
  // readable form. The organization must put it in its CRM/webhook verifier.
  return NextResponse.json({ ok: true, signingSecret: secret.secret }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const parsed = disableSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz entegrasyon işlemi." }, { status: 400 });
  const actor = await requireOrganizationRole(request, parsed.data.organizationId, ["OWNER", "ADMIN"]);
  if (!actor) return NextResponse.json({ error: "Webhook entegrasyonunu yönetme yetkin yok." }, { status: 403 });
  const { error } = await getSupabaseAdminClient()
    .from("organization_integrations")
    .update({ status: "DISABLED", updated_at: new Date().toISOString() })
    .eq("organization_id", parsed.data.organizationId)
    .eq("provider", "WEBHOOK");
  if (error) return NextResponse.json({ error: "Webhook devre dışı bırakılamadı." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
