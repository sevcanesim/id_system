import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "../../../../lib/admin/require-admin";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const grantSchema = z.object({
  action: z.literal("grant"),
  email: z.string().trim().email(),
});

const revokeSchema = z.object({
  action: z.literal("revoke"),
  userId: z.string().uuid(),
});

async function adminDirectory(admin: ReturnType<typeof getSupabaseAdminClient>) {
  const { data: rows, error } = await admin.from("admin_users").select("user_id");
  if (error) throw new Error("ADMIN_DIRECTORY_UNAVAILABLE");

  const items = await Promise.all((rows || []).map(async (row) => {
    const { data } = await admin.auth.admin.getUserById(row.user_id);
    return {
      userId: row.user_id,
      email: data.user?.email || null,
      lastSignInAt: data.user?.last_sign_in_at || null,
      createdAt: data.user?.created_at || null,
    };
  }));

  return items;
}

export async function GET(request: NextRequest) {
  const context = await requireSuperAdmin(request);
  if (!context) return NextResponse.json({ error: "AAL2 doğrulamalı Super Admin yetkisi gerekli." }, { status: 403 });

  try {
    return NextResponse.json({ admins: await adminDirectory(context.admin), currentUserId: context.user.id });
  } catch {
    return NextResponse.json({ error: "Super Admin listesi yüklenemedi." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const context = await requireSuperAdmin(request);
  if (!context) return NextResponse.json({ error: "AAL2 doğrulamalı Super Admin yetkisi gerekli." }, { status: 403 });

  const parsed = grantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçerli bir kullanıcı e-postası girin." }, { status: 400 });

  const email = parsed.data.email.toLowerCase();
  const { data: users, error: listError } = await context.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) return NextResponse.json({ error: "Kullanıcı dizini okunamadı." }, { status: 503 });

  const user = users.users.find((item) => item.email?.toLowerCase() === email);
  if (!user) return NextResponse.json({ error: "Bu e-postaya ait Yenomi hesabı bulunamadı. Önce normal kullanıcı hesabı oluşturulmalı." }, { status: 404 });

  const { error } = await context.admin.from("admin_users").upsert({ user_id: user.id }, { onConflict: "user_id" });
  if (error) return NextResponse.json({ error: "Super Admin yetkisi verilemedi." }, { status: 503 });

  await context.admin.from("admin_audit_log").insert({
    actor_user_id: context.user.id,
    action: "SUPER_ADMIN_GRANTED",
    target_table: "admin_users",
    target_id: user.id,
    after_value: { user_id: user.id },
  });

  return NextResponse.json({ ok: true, userId: user.id, email: user.email || email });
}

export async function DELETE(request: NextRequest) {
  const context = await requireSuperAdmin(request);
  if (!context) return NextResponse.json({ error: "AAL2 doğrulamalı Super Admin yetkisi gerekli." }, { status: 403 });

  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz yönetici kimliği." }, { status: 400 });
  if (parsed.data.userId === context.user.id) return NextResponse.json({ error: "Kendi Super Admin yetkinizi bu ekrandan kaldıramazsınız." }, { status: 409 });

  const { count, error: countError } = await context.admin.from("admin_users").select("user_id", { count: "exact", head: true });
  if (countError) return NextResponse.json({ error: "Yönetici sayısı doğrulanamadı." }, { status: 503 });
  if ((count ?? 0) <= 1) return NextResponse.json({ error: "Sistemde en az bir Super Admin kalmalıdır." }, { status: 409 });

  const { error } = await context.admin.from("admin_users").delete().eq("user_id", parsed.data.userId);
  if (error) return NextResponse.json({ error: "Super Admin yetkisi kaldırılamadı." }, { status: 503 });

  await context.admin.from("admin_audit_log").insert({
    actor_user_id: context.user.id,
    action: "SUPER_ADMIN_REVOKED",
    target_table: "admin_users",
    target_id: parsed.data.userId,
    before_value: { user_id: parsed.data.userId },
  });

  return NextResponse.json({ ok: true });
}
