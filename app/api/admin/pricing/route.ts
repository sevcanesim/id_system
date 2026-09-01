import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "../../../../lib/admin/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRODUCT_SKUS = [
  "YENOMI-NFC-CARD-ANNUAL",
  "YENOMI-NFC-PREMIUM-ANNUAL",
  "YENOMI-PREMIUM-UPGRADE",
  "YENOMI-DIGITAL-RENEWAL-ANNUAL",
  "YENOMI-PREMIUM-RENEWAL-ANNUAL",
  "YENOMI-BUSINESS-SEATS-1",
  "YENOMI-BUSINESS-SEATS-5",
  "YENOMI-BUSINESS-SEATS-10",
  "YENOMI-NETWORK-MAIL-100",
  "YENOMI-NETWORK-MAIL-500",
  "YENOMI-NETWORK-MAIL-1000",
  "YENOMI-NETWORK-MAIL-5000",
] as const;

const CORPORATE_CODES = ["CORP-2", "CORP-3", "CORP-5", "CORP-10", "CORP-25", "CORP-50", "CORP-100"] as const;

const productSchema = z.object({
  kind: z.literal("PRODUCT_VARIANT"),
  sku: z.enum(PRODUCT_SKUS),
  priceKurus: z.number().int().min(0).max(1_000_000_000),
});
const planSchema = z.object({
  kind: z.literal("CORPORATE_PLAN"),
  code: z.enum(CORPORATE_CODES),
  priceKurus: z.number().int().min(0).max(1_000_000_000),
});
const schema = z.discriminatedUnion("kind", [productSchema, planSchema]);

export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin(request);
  if (!ctx) return NextResponse.json({ error: "Super Admin yetkisi gerekli." }, { status: 403 });

  const [{ data: variants, error: variantError }, { data: plans, error: planError }] = await Promise.all([
    ctx.admin
      .from("product_variants")
      .select("id,sku,name,price_kurus,billing_period,metadata,is_active,updated_at")
      .in("sku", [...PRODUCT_SKUS])
      .order("sku", { ascending: true }),
    ctx.admin
      .from("business_plans")
      .select("id,code,name,seat_limit,annual_price_kurus,monthly_price_kurus,is_active")
      .in("code", [...CORPORATE_CODES])
      .order("seat_limit", { ascending: true }),
  ]);
  if (variantError || planError) return NextResponse.json({ error: "Fiyat kataloğu yüklenemedi." }, { status: 500 });
  return NextResponse.json({ variants: variants ?? [], plans: plans ?? [] });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireSuperAdmin(request);
  if (!ctx) return NextResponse.json({ error: "Super Admin yetkisi gerekli." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz fiyat bilgisi." }, { status: 400 });

  if (parsed.data.kind === "PRODUCT_VARIANT") {
    const { data: before } = await ctx.admin.from("product_variants").select("id,sku,name,price_kurus").eq("sku", parsed.data.sku).maybeSingle();
    if (!before) return NextResponse.json({ error: "Ürün varyantı bulunamadı." }, { status: 404 });
    const { data: after, error } = await ctx.admin
      .from("product_variants")
      .update({ price_kurus: parsed.data.priceKurus, updated_at: new Date().toISOString() })
      .eq("sku", parsed.data.sku)
      .select("id,sku,name,price_kurus")
      .maybeSingle();
    if (error || !after) return NextResponse.json({ error: "Ürün fiyatı güncellenemedi." }, { status: 500 });
    await ctx.admin.from("admin_audit_log").insert({
      actor_user_id: ctx.user.id,
      action: "PRODUCT_PRICE_UPDATED",
      target_table: "product_variants",
      target_id: before.id,
      before_value: before,
      after_value: after,
    });
    return NextResponse.json({ ok: true, item: after });
  }

  const { data: before } = await ctx.admin.from("business_plans").select("id,code,name,annual_price_kurus").eq("code", parsed.data.code).maybeSingle();
  if (!before) return NextResponse.json({ error: "Kurumsal paket bulunamadı." }, { status: 404 });
  const { data: after, error } = await ctx.admin
    .from("business_plans")
    .update({ annual_price_kurus: parsed.data.priceKurus })
    .eq("code", parsed.data.code)
    .select("id,code,name,annual_price_kurus")
    .maybeSingle();
  if (error || !after) return NextResponse.json({ error: "Kurumsal paket fiyatı güncellenemedi." }, { status: 500 });

  // Corporate checkout variants and business_plans are two views of one sellable package.
  // Keep them in one admin transaction boundary as far as the REST operation permits.
  const sku = `YENOMI-${parsed.data.code}`;
  const { error: variantError } = await ctx.admin.from("product_variants").update({ price_kurus: parsed.data.priceKurus, updated_at: new Date().toISOString() }).eq("sku", sku);
  if (variantError) {
    await ctx.admin.from("business_plans").update({ annual_price_kurus: before.annual_price_kurus }).eq("id", before.id);
    return NextResponse.json({ error: "Kurumsal checkout fiyatı eşitlenemedi; değişiklik geri alındı." }, { status: 500 });
  }

  await ctx.admin.from("admin_audit_log").insert({
    actor_user_id: ctx.user.id,
    action: "CORPORATE_PLAN_PRICE_UPDATED",
    target_table: "business_plans",
    target_id: before.id,
    before_value: before,
    after_value: { ...after, checkoutSku: sku },
  });
  return NextResponse.json({ ok: true, item: after });
}
