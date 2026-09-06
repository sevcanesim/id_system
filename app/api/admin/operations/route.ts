import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "../../../../lib/admin/require-admin";
import { createAdminOperationsDemoData } from "../../../../lib/admin/operations-demo-data";
import { decryptCorporateLeadPayload } from "../../../../lib/security/corporate-lead-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cardActionSchema = z.object({ action: z.enum(["REQUEST_PRINT", "START_PRINT", "APPROVE_PRINT", "SHIP", "OUT_FOR_DELIVERY", "DELIVER", "CANCEL_CARD"]), unitId: z.string().uuid(), carrier: z.string().trim().max(80).optional(), trackingNumber: z.string().trim().max(120).optional(), note: z.string().trim().max(500).optional() });
const mailActionSchema = z.object({ action: z.literal("ADJUST_NETWORK_MAIL"), scope: z.enum(["INDIVIDUAL", "ORGANIZATION"]), userId: z.string().uuid().optional(), organizationId: z.string().uuid().optional(), mode: z.enum(["ADD", "RESET"]), amount: z.number().int().min(-1000000).max(1000000), reason: z.string().trim().min(3).max(240) });
const renewalActionSchema = z.object({ action: z.enum(["QUEUE_RENEWALS", "MARK_RENEWAL_NOTIFIED", "MARK_RENEWAL_INVOICED", "MARK_RENEWAL_PAID", "CANCEL_RENEWAL"]), noticeId: z.string().uuid().optional(), invoiceReference: z.string().trim().max(120).optional(), daysAhead: z.number().int().min(0).max(365).optional() });
const privacyActionSchema = z.object({ action: z.literal("UPDATE_PRIVACY_REQUEST"), requestId: z.string().uuid(), status: z.enum(["IN_REVIEW", "IDENTITY_VERIFIED", "COMPLETED", "REJECTED", "CANCELLED"]), resolutionCode: z.string().trim().regex(/^[A-Z0-9_:-]{3,80}$/).optional() });
const corporateLeadActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("UPDATE_CORPORATE_LEAD"), leadId: z.string().uuid(), status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CLOSED", "SPAM"]) }),
  z.object({ action: z.literal("RETRY_CORPORATE_LEAD_NOTIFICATION"), leadId: z.string().uuid() }),
]);
const actionToStatus = { REQUEST_PRINT: "PRINT_PENDING", START_PRINT: "PRINTING", APPROVE_PRINT: "SHIPPING_PENDING", SHIP: "IN_TRANSIT", OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY", DELIVER: "DELIVERED", CANCEL_CARD: "CANCELLED" } as const;

export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin(request);
  if (!ctx) return NextResponse.json({ error: "Super Admin yetkisi gerekli." }, { status: 403 });

  // Demo mode is explicit and read-only. It never writes seed rows into Supabase,
  // so design/QA can exercise a realistic console without polluting production data.
  if (request.nextUrl.searchParams.get("demo") === "1") {
    return NextResponse.json({ ...createAdminOperationsDemoData(), demo: true });
  }

  const [unitsResult, premiumResult, termsResult, noticesResult, auditResult, mailLedgerResult, jobRunsResult, privacyRequestsResult, corporateLeadsResult] = await Promise.all([
    ctx.admin.from("commerce_physical_card_units").select("id,order_item_id,instance_no,purpose,organization_id,operations_status,status,physical_card_id,carrier,tracking_number,print_requested_at,print_started_at,print_approved_at,shipped_at,out_for_delivery_at,delivered_at,created_at,updated_at").neq("operations_status", "CANCELLED").order("created_at", { ascending: true }).limit(500),
    ctx.admin.from("entitlements").select("id,user_id,package_code,status,starts_at,expires_at,network_mail_limit,network_mail_remaining,created_at,updated_at").eq("package_code", "INDIVIDUAL_PREMIUM").order("expires_at", { ascending: true, nullsFirst: false }).limit(500),
    ctx.admin.from("organization_capacity_terms").select("id,organization_id,source_order_id,source_order_item_id,renewed_from_id,card_count,starts_at,expires_at,renewal_price_kurus,currency,status,created_at,updated_at").order("expires_at", { ascending: true }).limit(500),
    ctx.admin.from("organization_capacity_renewal_notices").select("id,term_id,organization_id,due_at,renewal_price_kurus,currency,status,invoice_reference,notified_at,invoiced_at,paid_at,created_at,updated_at").order("due_at", { ascending: true }).limit(500),
    ctx.admin.from("admin_audit_log").select("id,actor_user_id,action,target_table,target_id,before_value,after_value,created_at").order("created_at", { ascending: false }).limit(200),
    ctx.admin.from("network_mail_adjustment_ledger").select("id,scope,user_id,organization_id,entitlement_id,delta,balance_before,balance_after,reason,actor_user_id,created_at").order("created_at", { ascending: false }).limit(200),
    ctx.admin.from("operational_job_runs").select("id,job_name,status,started_at,finished_at,processed_count,error_code").order("started_at", { ascending: false }).limit(100),
    ctx.admin.from("privacy_requests").select("id,user_id,request_type,status,identity_verified_at,resolved_at,resolution_code,created_at,updated_at").order("created_at", { ascending: true }).limit(200),
    ctx.admin.from("corporate_leads").select("id,full_name,email,company,employee_count,message,plan,source,status,encrypted_payload,notification_status,notification_attempts,first_notified_at,last_notified_at,last_notification_error_code,created_at,updated_at").order("created_at", { ascending: false }).limit(200),
  ]);
  const firstError = [unitsResult.error, premiumResult.error, termsResult.error, noticesResult.error, auditResult.error, mailLedgerResult.error, jobRunsResult.error, privacyRequestsResult.error, corporateLeadsResult.error].find(Boolean);
  if (firstError) return NextResponse.json({ error: "Operasyon verileri yüklenemedi." }, { status: 500 });

  const units = unitsResult.data ?? [];
  const itemIds = [...new Set(units.map((unit) => unit.order_item_id))];
  const termOrgIds = (termsResult.data ?? []).map((term) => term.organization_id);
  const premiumUserIds = (premiumResult.data ?? []).map((entitlement) => entitlement.user_id).filter(Boolean) as string[];
  const privacyUserIds = (privacyRequestsResult.data ?? []).map((entry) => entry.user_id);
  const [itemsResult, orgsResult, profilesResult, privacyAccountsResult] = await Promise.all([
    itemIds.length ? ctx.admin.from("commerce_order_items").select("id,order_id,product_name,product_kind,quantity,unit_price_kurus,configuration").in("id", itemIds) : Promise.resolve({ data: [], error: null }),
    termOrgIds.length ? ctx.admin.from("organizations").select("id,name,corporate_id,status").in("id", [...new Set(termOrgIds)]) : Promise.resolve({ data: [], error: null }),
    premiumUserIds.length ? ctx.admin.from("card_profiles").select("id,user_id,name,email,slug").in("user_id", [...new Set(premiumUserIds)]).is("organization_id", null) : Promise.resolve({ data: [], error: null }),
    privacyUserIds.length ? ctx.admin.from("user_accounts").select("id,yenomi_id,display_name,status").in("id", [...new Set(privacyUserIds)]) : Promise.resolve({ data: [], error: null }),
  ]);
  const items = itemsResult.data ?? [];
  const orderIds = [...new Set(items.map((item) => item.order_id))];
  const { data: orders, error: ordersError } = orderIds.length ? await ctx.admin.from("commerce_orders").select("id,order_number,user_id,guest_email,customer_name,status,total_kurus,currency,paid_at,created_at,tracking_company,tracking_number").in("id", orderIds) : { data: [], error: null };
  if (itemsResult.error || orgsResult.error || profilesResult.error || privacyAccountsResult.error || ordersError) return NextResponse.json({ error: "Operasyon ilişkileri yüklenemedi." }, { status: 500 });
  const itemById = new Map(items.map((item) => [item.id, item]));
  const orderById = new Map((orders ?? []).map((order) => [order.id, order]));
  const orgById = new Map((orgsResult.data ?? []).map((org) => [org.id, org]));
  const profileByUserId = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, profile]));
  const privacyAccountById = new Map((privacyAccountsResult.data ?? []).map((account) => [account.id, account]));
  const corporateLeads = (corporateLeadsResult.data ?? []).map((lead) => {
    const decrypted = decryptCorporateLeadPayload(lead.id, lead.encrypted_payload);
    return {
      id: lead.id,
      contact: decrypted ?? {
        fullName: lead.full_name ?? "Eski kayıt",
        email: lead.email ?? "—",
        company: lead.company ?? "—",
        employeeCount: lead.employee_count ?? "—",
        message: lead.message ?? "",
      },
      plan: lead.plan,
      source: lead.source,
      status: lead.status,
      notificationStatus: lead.notification_status,
      notificationAttempts: lead.notification_attempts,
      firstNotifiedAt: lead.first_notified_at,
      lastNotifiedAt: lead.last_notified_at,
      lastNotificationErrorCode: lead.last_notification_error_code,
      createdAt: lead.created_at,
      updatedAt: lead.updated_at,
      encrypted: Boolean(lead.encrypted_payload),
    };
  });
  return NextResponse.json({ printQueue: units.map((unit) => { const item = itemById.get(unit.order_item_id); const order = item ? orderById.get(item.order_id) : null; return { ...unit, item: item ?? null, order: order ?? null }; }), premiumUsers: (premiumResult.data ?? []).map((entitlement) => ({ ...entitlement, profile: entitlement.user_id ? profileByUserId.get(entitlement.user_id) ?? null : null })), capacityTerms: (termsResult.data ?? []).map((term) => ({ ...term, organization: orgById.get(term.organization_id) ?? null })), renewalNotices: noticesResult.data ?? [], mailAdjustments: mailLedgerResult.data ?? [], jobRuns: jobRunsResult.data ?? [], privacyRequests: (privacyRequestsResult.data ?? []).map((entry) => ({ ...entry, account: privacyAccountById.get(entry.user_id) ?? null })), corporateLeads, auditLog: auditResult.data ?? [], demo: false });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireSuperAdmin(request); if (!ctx) return NextResponse.json({ error: "Super Admin yetkisi gerekli." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.action === "UPDATE_CORPORATE_LEAD" || body?.action === "RETRY_CORPORATE_LEAD_NOTIFICATION") {
    const parsed = corporateLeadActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Kurumsal teklif işlemi geçersiz." }, { status: 400 });
    const input = parsed.data;
    const { data: before } = await ctx.admin.from("corporate_leads").select("id,status,notification_status,notification_attempts,last_notification_error_code").eq("id", input.leadId).maybeSingle();
    if (!before) return NextResponse.json({ error: "Kurumsal teklif kaydı bulunamadı." }, { status: 404 });
    if (input.action === "RETRY_CORPORATE_LEAD_NOTIFICATION") {
      if (before.notification_status === "LEGACY_UNVERIFIED") return NextResponse.json({ error: "Bu eski kayıt şifreli formata taşınmadan yeniden bildirilemez." }, { status: 409 });
      const { data: updated, error } = await ctx.admin.from("corporate_leads").update({ notification_status: "PENDING", notification_next_attempt_at: new Date().toISOString(), notification_lease_expires_at: null, last_notification_error_code: null }).eq("id", input.leadId).select("id,status,notification_status,notification_attempts,last_notification_error_code").maybeSingle();
      if (error || !updated) return NextResponse.json({ error: "Bildirim yeniden kuyruğa alınamadı." }, { status: 500 });
      await ctx.admin.from("admin_audit_log").insert({ actor_user_id: ctx.user.id, action: "CORPORATE_LEAD_NOTIFICATION_REQUEUED", target_table: "corporate_leads", target_id: input.leadId, before_value: before, after_value: updated });
      return NextResponse.json({ ok: true, lead: updated });
    }
    const values: Record<string, string | null> = { status: input.status };
    if (input.status === "CONTACTED") values.updated_at = new Date().toISOString();
    const { data: updated, error } = await ctx.admin.from("corporate_leads").update(values).eq("id", input.leadId).select("id,status,notification_status,notification_attempts,last_notification_error_code").maybeSingle();
    if (error || !updated) return NextResponse.json({ error: "Kurumsal teklif durumu güncellenemedi." }, { status: 500 });
    await ctx.admin.from("admin_audit_log").insert({ actor_user_id: ctx.user.id, action: `CORPORATE_LEAD_${input.status}`, target_table: "corporate_leads", target_id: input.leadId, before_value: before, after_value: updated });
    return NextResponse.json({ ok: true, lead: updated });
  }
  if (body?.action === "UPDATE_PRIVACY_REQUEST") {
    const parsed = privacyActionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Gizlilik talebi geçersiz." }, { status: 400 });
    const input = parsed.data;
    const { data, error } = await ctx.admin.rpc("admin_transition_privacy_request", { p_actor_user_id: ctx.user.id, p_request_id: input.requestId, p_next_status: input.status, p_resolution_code: input.resolutionCode ?? null });
    const result = data as { ok?: boolean; code?: string; request?: unknown } | null;
    if (error || !result?.ok) return NextResponse.json({ error: result?.code === "INVALID_TRANSITION" ? "Bu talep için seçilen durum geçişi uygun değil." : result?.code === "RESOLUTION_CODE_REQUIRED" ? "Sonuçlanan talep için çözüm kodu gerekli." : "Gizlilik talebi güncellenemedi." }, { status: 409 });
    return NextResponse.json({ ok: true, request: result.request });
  }
  if (body?.action === "ADJUST_NETWORK_MAIL") {
    const parsed = mailActionSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz kota işlemi." }, { status: 400 });
    const input = parsed.data; if (input.scope === "INDIVIDUAL" && !input.userId) return NextResponse.json({ error: "Kullanıcı gerekli." }, { status: 400 }); if (input.scope === "ORGANIZATION" && !input.organizationId) return NextResponse.json({ error: "Şirket gerekli." }, { status: 400 });
    const rpc = input.scope === "INDIVIDUAL" ? await ctx.admin.rpc("admin_adjust_individual_network_mail", { p_user_id: input.userId, p_mode: input.mode, p_amount: input.amount, p_reason: input.reason, p_actor_user_id: ctx.user.id }) : await ctx.admin.rpc("admin_adjust_organization_network_mail", { p_organization_id: input.organizationId, p_mode: input.mode, p_amount: input.amount, p_reason: input.reason, p_actor_user_id: ctx.user.id });
    const result = rpc.data as { ok?: boolean; code?: string; before?: number; after?: number; delta?: number } | null; if (rpc.error || !result?.ok) return NextResponse.json({ error: result?.code ?? "Kota güncellenemedi." }, { status: 409 });
    await ctx.admin.from("admin_audit_log").insert({ actor_user_id: ctx.user.id, action: "NETWORK_MAIL_ADJUSTED", target_table: input.scope === "INDIVIDUAL" ? "entitlements" : "organization_entitlements", target_id: input.scope === "INDIVIDUAL" ? input.userId! : input.organizationId!, before_value: { remaining: result.before }, after_value: { remaining: result.after, delta: result.delta, mode: input.mode, reason: input.reason } }); return NextResponse.json({ ok: true, adjustment: result });
  }
  if (String(body?.action || "").includes("RENEWAL") || body?.action === "QUEUE_RENEWALS") {
    const parsed = renewalActionSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz yenileme işlemi." }, { status: 400 }); const input = parsed.data;
    if (input.action === "QUEUE_RENEWALS") { const { data, error } = await ctx.admin.rpc("queue_due_capacity_renewals", { p_days_ahead: input.daysAhead ?? 30 }); if (error) return NextResponse.json({ error: "Yenileme kuyruğu oluşturulamadı." }, { status: 500 }); return NextResponse.json({ ok: true, result: data }); }
    if (!input.noticeId) return NextResponse.json({ error: "Yenileme kaydı gerekli." }, { status: 400 }); const { data: before } = await ctx.admin.from("organization_capacity_renewal_notices").select("*").eq("id", input.noticeId).maybeSingle(); if (!before) return NextResponse.json({ error: "Yenileme kaydı bulunamadı." }, { status: 404 }); const now = new Date().toISOString(); const values: Record<string, string | null> = { updated_at: now };
    if (input.action === "MARK_RENEWAL_NOTIFIED") { values.status = "NOTIFIED"; values.notified_at = now; } if (input.action === "MARK_RENEWAL_INVOICED") { if (!input.invoiceReference) return NextResponse.json({ error: "Fatura referansı gerekli." }, { status: 400 }); values.status = "INVOICED"; values.invoiced_at = now; values.invoice_reference = input.invoiceReference; } if (input.action === "MARK_RENEWAL_PAID") { values.status = "PAID"; values.paid_at = now; } if (input.action === "CANCEL_RENEWAL") values.status = "CANCELLED";
    const { data: updated, error } = await ctx.admin.from("organization_capacity_renewal_notices").update(values).eq("id", input.noticeId).select("*").maybeSingle(); if (error || !updated) return NextResponse.json({ error: "Yenileme kaydı güncellenemedi." }, { status: 500 }); await ctx.admin.from("admin_audit_log").insert({ actor_user_id: ctx.user.id, action: input.action, target_table: "organization_capacity_renewal_notices", target_id: input.noticeId, before_value: before, after_value: updated }); return NextResponse.json({ ok: true, renewal: updated });
  }
  const parsed = cardActionSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz kart işlemi." }, { status: 400 }); const input = parsed.data; const nextStatus = actionToStatus[input.action]; const { data: before } = await ctx.admin.from("commerce_physical_card_units").select("*").eq("id", input.unitId).maybeSingle(); if (!before) return NextResponse.json({ error: "Kart üretim kaydı bulunamadı." }, { status: 404 });
  const { data, error } = await ctx.admin.rpc("transition_physical_card_unit", { p_unit_id: input.unitId, p_next_status: nextStatus, p_actor_user_id: ctx.user.id, p_source: "ADMIN", p_carrier: input.carrier ?? null, p_tracking_number: input.trackingNumber ?? null, p_note: input.note ?? null }); const result = data as { ok?: boolean; code?: string; current?: string; from?: string; to?: string } | null; if (error || !result?.ok) return NextResponse.json({ error: result?.code ?? "Kart durumu güncellenemedi.", current: result?.current }, { status: 409 });
  const { data: after } = await ctx.admin.from("commerce_physical_card_units").select("*").eq("id", input.unitId).maybeSingle(); await ctx.admin.from("admin_audit_log").insert({ actor_user_id: ctx.user.id, action: `PHYSICAL_CARD_${input.action}`, target_table: "commerce_physical_card_units", target_id: input.unitId, before_value: before, after_value: after }); return NextResponse.json({ ok: true, transition: result, unit: after });
}
