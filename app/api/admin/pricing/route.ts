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

const productSchema = z.object({ kind: z.literal("PRODUCT_VARIANT"), sku: z.enum(PRODUCT_SKUS), priceKurus: z.number().int().min(0).max(1_000_000_000) });
const planSchema = z.object({ kind: z.literal("CORPORATE_PLAN"), code: z.enum(CORPORATE_CODES), priceKurus: z.number().int().min(0).max(1_000_000_000) });
const schema = z.discriminatedUnion("kind", [productSchema, planSchema]);

function demoPricing() {
  return {
    demo: true,
    variants: [
      { id: "d1", sku: "YENOMI-NFC-CARD-ANNUAL", name: "Yenomi ID Standard", price_kurus: 149000, billing_period: "ANNUAL", is_active: true },
      { id: "d2", sku: "YENOMI-NFC-PREMIUM-ANNUAL", name: "Yenomi ID Premium — NFC + 100 Network Mail", price_kurus: 249000, billing_period: "ANNUAL", is_active: true },
      { id: "d3", sku: "YENOMI-PREMIUM-UPGRADE", name: "Standard → Premium Yükseltme", price_kurus: 100000, billing_period: "ONE_TIME", is_active: true },
      { id: "d4", sku: "YENOMI-DIGITAL-RENEWAL-ANNUAL", name: "Standard Yıllık Yenileme", price_kurus: 59900, billing_period: "ANNUAL", is_active: true },
      { id: "d5", sku: "YENOMI-PREMIUM-RENEWAL-ANNUAL", name: "Premium Yıllık Yenileme", price_kurus: 99900, billing_period: "ANNUAL", is_active: true },
      { id: "d6", sku: "YENOMI-NETWORK-MAIL-100", name: "Network Mail 100", price_kurus: 19900, billing_period: "ONE_TIME", is_active: true },
      { id: "d7", sku: "YENOMI-NETWORK-MAIL-500", name: "Network Mail 500", price_kurus: 74900, billing_period: "ONE_TIME", is_active: true },
      { id: "d8", sku: "YENOMI-NETWORK-MAIL-1000", name: "Network Mail 1000", price_kurus: 129900, billing_period: "ONE_TIME", is_active: true },
    ],
    plans: [
      { id: "p2", code: "CORP-2", name: "Kurumsal 2", seat_limit: 2, annual_price_kurus: 299000, is_active: true },
      { id: "p5", code: "CORP-5", name: "Kurumsal 5", seat_limit: 5, annual_price_kurus: 649000, is_active: true },
      { id: "p10", code: "CORP-10", name: "Kurumsal 10", seat_limit: 10, annual_price_kurus: 1199000, is_active: true },
      { id: "p25", code: "CORP-25", name: "Kurumsal 25", seat_limit: 25, annual_price_kurus: 2499000, is_active: true },
      { id: "p50", code: "CORP-50", name: "Kurumsal 50", seat_limit: 50, annual_price_kurus: 4499000, is_active: true },
      { id: "p100", code: "CORP-100", name: "Kurumsal 100", seat_limit: 100, annual_price_kurus: 7999000, is_active: true },
    ],
  };
}

export async function GET(request: NextRequest) {
  const ctx = await requireSuperAdmin(request);
  if (!ctx) return NextResponse.json({ error: "Super Admin yetkisi gerekli." }, { status: 403 });
  if (request.nextUrl.searchParams.get("demo") === "1") return NextResponse.json(demoPricing());

  const [{ data: variants, error: variantError }, { data: plans, error: planError }] = await Promise.all([
    ctx.admin.from("product_variants").select("id,sku,name,price_kurus,billing_period,metadata,is_active,updated_at").in("sku", [...PRODUCT_SKUS]).order("sku", { ascending: true }),
    ctx.admin.from("business_plans").select("id,code,name,seat_limit,annual_price_kurus,monthly_price_kurus,is_active").in("code", [...CORPORATE_CODES]).order("seat_limit", { ascending: true }),
  ]);
  if (variantError || planError) {
    console.error("admin pricing load failed", { variantError, planError });
    return NextResponse.json({ error: "Fiyat kataloğu yüklenemedi.", code: variantError?.code ?? planError?.code ?? null }, { status: 500 });
  }
  return NextResponse.json({ variants: variants ?? [], plans: plans ?? [], demo: false });
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireSuperAdmin(request);
  if (!ctx) return NextResponse.json({ error: "Super Admin yetkisi gerekli." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz fiyat bilgisi." }, { status: 400 });

  if (parsed.data.kind === "PRODUCT_VARIANT") {
    const { data: before } = await ctx.admin.from("product_variants").select("id,sku,name,price_kurus").eq("sku", parsed.data.sku).maybeSingle();
    if (!before) return NextResponse.json({ error: "Ürün varyantı bulunamadı." }, { status: 404 });
    const { data: after, error } = await ctx.admin.from("product_variants").update({ price_kurus: parsed.data.priceKurus, updated_at: new Date().toISOString() }).eq("sku", parsed.data.sku).select("id,sku,name,price_kurus").maybeSingle();
    if (error || !after) return NextResponse.json({ error: "Ürün fiyatı güncellenemedi." }, { status: 500 });
    await ctx.admin.from("admin_audit_log").insert({ actor_user_id: ctx.user.id, action: "PRODUCT_PRICE_UPDATED", target_table: "product_variants", target_id: before.id, before_value: before, after_value: after });
    return NextResponse.json({ ok: true, item: after });
  }

  const { data: before } = await ctx.admin.from("business_plans").select("id,code,name,annual_price_kurus").eq("code", parsed.data.code).maybeSingle();
  if (!before) return NextResponse.json({ error: "Kurumsal paket bulunamadı." }, { status: 404 });
  const { data: after, error } = await ctx.admin.from("business_plans").update({ annual_price_kurus: parsed.data.priceKurus }).eq("code", parsed.data.code).select("id,code,name,annual_price_kurus").maybeSingle();
  if (error || !after) return NextResponse.json({ error: "Kurumsal paket fiyatı güncellenemedi." }, { status: 500 });
  const sku = `YENOMI-${parsed.data.code}`;
  const { error: variantError } = await ctx.admin.from("product_variants").update({ price_kurus: parsed.data.priceKurus, updated_at: new Date().toISOString() }).eq("sku", sku);
  if (variantError) {
    await ctx.admin.from("business_plans").update({ annual_price_kurus: before.annual_price_kurus }).eq("id", before.id);
    return NextResponse.json({ error: "Kurumsal checkout fiyatı eşitlenemedi; değişiklik geri alındı." }, { status: 500 });
  }
  await ctx.admin.from("admin_audit_log").insert({ actor_user_id: ctx.user.id, action: "CORPORATE_PLAN_PRICE_UPDATED", target_table: "business_plans", target_id: before.id, before_value: before, after_value: { ...after, checkoutSku: sku } });
  return NextResponse.json({ ok: true, item: after });
}
