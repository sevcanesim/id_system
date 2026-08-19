import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../../lib/supabase/server-admin";

export const runtime = "nodejs";

const resolveSchema = z.object({
  issueId: z.string().uuid(),
  resolutionNote: z.string().trim().min(8, "Çözüm notu en az 8 karakter olmalı.").max(1000),
});

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  const admin = getSupabaseAdminClient();
  const { data: row } = await admin.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return row ? { user: data.user, admin } : null;
}

export async function GET(request: NextRequest) {
  try {
    const context = await requireAdmin(request);
    if (!context) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });

    const [{ data: orders, error: orderError }, { data: attempts, error: attemptError }, { data: issues, error: issueError }] = await Promise.all([
      context.admin
        .from("commerce_orders")
        .select("id,order_number,status,total_kurus,currency,guest_email,paid_at,created_at,activation_claimed_at,user_id")
        .order("created_at", { ascending: false })
        .limit(500),
      context.admin
        .from("commerce_payment_attempts")
        .select("id,order_id,status,provider_payment_id,error_code,error_message,updated_at")
        .order("updated_at", { ascending: false })
        .limit(1000),
      context.admin
        .from("commerce_fulfillment_issues")
        .select("id,order_id,order_item_id,issue_code,details,resolved_at,resolution_note,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);

    if (orderError || attemptError || issueError) {
      console.error("commerce reconciliation load failed", { orderError, attemptError, issueError });
      return NextResponse.json({ error: "Ödeme mutabakatı yüklenemedi." }, { status: 500 });
    }

    const attemptsByOrder = new Map<string, typeof attempts>();
    for (const attempt of attempts ?? []) {
      const list = attemptsByOrder.get(attempt.order_id) ?? [];
      list.push(attempt);
      attemptsByOrder.set(attempt.order_id, list);
    }
    const issuesByOrder = new Map<string, typeof issues>();
    for (const issue of issues ?? []) {
      const list = issuesByOrder.get(issue.order_id) ?? [];
      list.push(issue);
      issuesByOrder.set(issue.order_id, list);
    }

    const rows = (orders ?? []).map((order) => {
      const orderAttempts = attemptsByOrder.get(order.id) ?? [];
      const orderIssues = issuesByOrder.get(order.id) ?? [];
      const paidAttempts = orderAttempts.filter((attempt) => attempt.status === "PAID");
      const openIssues = orderIssues.filter((issue) => !issue.resolved_at);
      const flags: string[] = [];

      if (order.status === "PAID" && paidAttempts.length === 0) flags.push("PAID_ORDER_WITHOUT_PAID_ATTEMPT");
      if (order.status !== "PAID" && paidAttempts.length > 0) flags.push("PAID_ATTEMPT_ORDER_NOT_PAID");
      if (openIssues.length > 0) flags.push("FULFILLMENT_REVIEW_REQUIRED");
      if (order.status === "PAID" && order.user_id && !order.activation_claimed_at) flags.push("AUTHENTICATED_ORDER_NOT_CLAIMED");

      return {
        ...order,
        paymentAttempts: orderAttempts,
        fulfillmentIssues: orderIssues,
        openIssueCount: openIssues.length,
        flags,
        requiresReview: flags.length > 0,
      };
    });

    const orphanPaidAttempts = (attempts ?? []).filter((attempt) =>
      attempt.status === "PAID" && !(orders ?? []).some((order) => order.id === attempt.order_id),
    );

    return NextResponse.json({
      rows,
      orphanPaidAttempts,
      summary: {
        checkedOrders: rows.length,
        requiresReview: rows.filter((row) => row.requiresReview).length,
        openFulfillmentIssues: (issues ?? []).filter((issue) => !issue.resolved_at).length,
        orphanPaidAttempts: orphanPaidAttempts.length,
      },
    });
  } catch (error) {
    console.error("commerce reconciliation error", error);
    return NextResponse.json({ error: "Ödeme mutabakatı yüklenemedi." }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
  try {
    const context = await requireAdmin(request);
    if (!context) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });

    const { data, error } = await context.admin.rpc("reconcile_paid_commerce_orders", { p_limit: 250 });
    if (error) {
      console.error("commerce reconciliation run failed", error);
      return NextResponse.json({ error: "Otomatik ödeme mutabakatı çalıştırılamadı." }, { status: 500 });
    }

    await context.admin.from("admin_audit_log").insert({
      actor_user_id: context.user.id,
      action: "COMMERCE_RECONCILIATION_RUN",
      target_table: "commerce_orders",
      target_id: "paid-orders",
      after_value: data ?? {},
    });

    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    console.error("commerce reconciliation run error", error);
    return NextResponse.json({ error: "Otomatik ödeme mutabakatı çalıştırılamadı." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await requireAdmin(request);
    if (!context) return NextResponse.json({ error: "Yönetici yetkisi gerekli." }, { status: 403 });
    const parsed = resolveSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Geçersiz çözüm kaydı." }, { status: 400 });

    const { data: issue, error: loadError } = await context.admin
      .from("commerce_fulfillment_issues")
      .select("id,order_id,issue_code,resolved_at")
      .eq("id", parsed.data.issueId)
      .maybeSingle();
    if (loadError || !issue) return NextResponse.json({ error: "Mutabakat kaydı bulunamadı." }, { status: 404 });
    if (issue.resolved_at) return NextResponse.json({ error: "Bu kayıt zaten çözümlenmiş." }, { status: 409 });

    const resolvedAt = new Date().toISOString();
    const { data: updated, error } = await context.admin
      .from("commerce_fulfillment_issues")
      .update({ resolved_at: resolvedAt, resolution_note: parsed.data.resolutionNote, updated_at: resolvedAt })
      .eq("id", issue.id)
      .is("resolved_at", null)
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Mutabakat kaydı çözümlenemedi." }, { status: 500 });
    if (!updated) return NextResponse.json({ error: "Kayıt başka bir işlem tarafından güncellendi. Sayfayı yenileyin." }, { status: 409 });

    await context.admin.from("admin_audit_log").insert({
      actor_user_id: context.user.id,
      action: "COMMERCE_RECONCILIATION_ISSUE_RESOLVED",
      target_table: "commerce_fulfillment_issues",
      target_id: issue.id,
      after_value: {
        order_id: issue.order_id,
        issue_code: issue.issue_code,
        resolution_note: parsed.data.resolutionNote,
        resolved_at: resolvedAt,
      },
    });

    return NextResponse.json({ ok: true, resolvedAt });
  } catch (error) {
    console.error("commerce reconciliation update error", error);
    return NextResponse.json({ error: "Mutabakat kaydı güncellenemedi." }, { status: 500 });
  }
}
