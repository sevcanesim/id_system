import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "../../../../lib/admin/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const lookupSchema = z.string().trim().regex(/^\d{12}$/, "Yenomi ID 12 haneli olmalı.");
const grantSchema = z.object({
  action: z.literal("grant_individual_premium"), yenomiId: lookupSchema,
  grantReason: z.enum(["ADVERTISING", "COMPLIMENTARY", "SUPPORT"]),
  termMode: z.enum(["PERPETUAL", "FIXED_TERM"]), renewalPolicy: z.enum(["NONE", "PAID_RENEWAL", "MANUAL_RENEWAL"]),
  expiresAt: z.string().datetime().optional().nullable(), networkMailLimit: z.number().int().min(0).max(100000).default(0), notes: z.string().trim().max(500).optional(),
});
const legalSchema = z.object({
  action: z.literal("update_organization_legal_identity"), organizationId: z.string().uuid(), taxNumber: z.string().trim().max(32).optional().default(""),
  taxOffice: z.string().trim().max(120).optional().default(""), legalName: z.string().trim().max(160).optional().default(""),
  billingAddress: z.string().trim().max(300).optional().default(""), billingCity: z.string().trim().max(80).optional().default(""), billingPhone: z.string().trim().max(40).optional().default(""), billingEmail: z.string().trim().email().or(z.literal("")).optional().default(""),
});
const userSchema = z.object({
  action: z.literal("update_user_account"), yenomiId: lookupSchema,
  displayName: z.string().trim().max(160).optional().default(""),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin(request);
  if (!ctx) return NextResponse.json({ error: "AAL2 doğrulamalı Super Admin yetkisi gerekli." }, { status: 403 });
  const parsed = lookupSchema.safeParse(request.nextUrl.searchParams.get("yenomiId") || "");
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Yenomi ID geçersiz." }, { status: 400 });
  const { data: account, error } = await ctx.admin.from("user_accounts").select("id,yenomi_id,email,display_name,status,account_type,package_code,created_at,last_sign_in_at").eq("yenomi_id", parsed.data).maybeSingle();
  if (error) return NextResponse.json({ error: "Kullanıcı kaydı okunamadı." }, { status: 500 });
  if (!account) return NextResponse.json({ error: "Bu Yenomi ID ile kullanıcı bulunamadı." }, { status: 404 });
  const [grants, orders, logs] = await Promise.all([
    ctx.admin.from("admin_access_grants").select("id,package_code,grant_reason,term_mode,renewal_policy,status,starts_at,expires_at,network_mail_limit,network_mail_remaining,notes,created_at,revoked_at").eq("user_id", account.id).order("created_at", { ascending: false }),
    ctx.admin.from("commerce_orders").select("id,order_number,status,total_kurus,currency,created_at,paid_at").eq("user_id", account.id).order("created_at", { ascending: false }).limit(100),
    ctx.admin.from("system_error_logs").select("id,request_id,source,error_code,message,occurred_at").eq("user_id", account.id).order("occurred_at", { ascending: false }).limit(100),
  ]);
  const orderIds = (orders.data || []).map((order) => order.id);
  const [{ data: invoices }, { data: payments }] = await Promise.all([
    orderIds.length ? ctx.admin.from("commerce_invoice_jobs").select("id,order_id,provider,status,provider_invoice_id,created_at,updated_at").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    orderIds.length ? ctx.admin.from("commerce_payment_attempts").select("id,order_id,provider,status,provider_payment_id,error_code,error_message,updated_at").in("order_id", orderIds).order("updated_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  return NextResponse.json({ account, grants: grants.data || [], orders: orders.data || [], invoices: invoices || [], payments: payments || [], systemErrors: logs.data || [] });
}

export async function POST(request: NextRequest) {
  const ctx = await requireSuperAdmin(request);
  if (!ctx) return NextResponse.json({ error: "AAL2 doğrulamalı Super Admin yetkisi gerekli." }, { status: 403 });
  const parsed = grantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Tahsis bilgisi geçersiz." }, { status: 400 });
  const body = parsed.data;
  if (body.termMode === "FIXED_TERM" && !body.expiresAt) return NextResponse.json({ error: "Süreli tahsis için bitiş tarihi gerekli." }, { status: 400 });
  const { data, error } = await ctx.admin.rpc("admin_grant_individual_premium", { p_actor_user_id: ctx.user.id, p_yenomi_id: body.yenomiId, p_grant_reason: body.grantReason, p_term_mode: body.termMode, p_renewal_policy: body.renewalPolicy, p_expires_at: body.termMode === "PERPETUAL" ? null : body.expiresAt, p_network_mail_limit: body.networkMailLimit, p_notes: body.notes || null });
  const result = data as { ok?: boolean; code?: string; grant?: unknown } | null;
  if (error || !result?.ok) return NextResponse.json({ error: result?.code === "USER_NOT_FOUND" ? "Bu Yenomi ID ile aktif kullanıcı bulunamadı." : "Premium tahsisi oluşturulamadı." }, { status: 409 });
  return NextResponse.json({ grant: result.grant });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireSuperAdmin(request);
  if (!ctx) return NextResponse.json({ error: "AAL2 doğrulamalı Super Admin yetkisi gerekli." }, { status: 403 });
  const input = await request.json().catch(() => null);
  const userUpdate = userSchema.safeParse(input);
  if (userUpdate.success) {
    const body = userUpdate.data;
    const { data, error } = await ctx.admin.rpc("admin_update_user_account", { p_actor_user_id: ctx.user.id, p_yenomi_id: body.yenomiId, p_display_name: body.displayName, p_status: body.status });
    const result = data as { ok?: boolean; code?: string; account?: unknown } | null;
    if (error || !result?.ok) return NextResponse.json({ error: result?.code === "USER_NOT_FOUND" ? "Kullanıcı bulunamadı." : "Kullanıcı bilgisi güncellenemedi." }, { status: 409 });
    return NextResponse.json({ account: result.account });
  }
  const parsed = legalSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Resmî bilgi geçersiz." }, { status: 400 });
  const body = parsed.data;
  const { data, error } = await ctx.admin.rpc("admin_update_organization_legal_identity", { p_actor_user_id: ctx.user.id, p_organization_id: body.organizationId, p_tax_number: body.taxNumber, p_tax_office: body.taxOffice, p_legal_name: body.legalName, p_billing_address: body.billingAddress, p_billing_city: body.billingCity, p_billing_phone: body.billingPhone, p_billing_email: body.billingEmail });
  const result = data as { ok?: boolean; code?: string; organization?: unknown } | null;
  if (error || !result?.ok) return NextResponse.json({ error: result?.code === "ORGANIZATION_NOT_FOUND" ? "Şirket bulunamadı." : "Resmî şirket bilgisi güncellenemedi." }, { status: 409 });
  return NextResponse.json({ organization: result.organization });
}
