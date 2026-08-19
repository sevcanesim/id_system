import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canRenameOrganization, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

// Şirketin görünen adını (organizations.name) değiştirir. Bu isim; kurumsal
// panel başlığında, genel kart sayfalarında ve — "Şirket adı" alan kilidi
// locked/suggested olduğunda — her çalışanın kart profilindeki Şirket
// alanında görünür (bkz. save_own_card_profile RPC'sindeki
// card_field_lock_mode kullanımı). Şablon rengi/logosundan farklı olarak
// yalnızca OWNER değiştirebilir.

const schema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2, "Şirket adı en az 2 karakter olmalı.").max(80, "Şirket adı en fazla 80 karakter olabilir."),
});

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function membership(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin
    .from("organization_members")
    .select("role,status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .maybeSingle();
  return data && isOrganizationRole(data.role) ? data : null;
}

export async function PATCH(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz şirket adı." }, { status: 400 });
  }

  const member = await membership(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!member || !canRenameOrganization(member.role, member.status)) {
    return NextResponse.json({ error: "Şirket adını yalnızca şirket sahibi değiştirebilir." }, { status: 403 });
  }

  const { data, error } = await ctx.admin
    .from("organizations")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.organizationId)
    .select("id,name,slug,status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Şirket adı güncellenemedi." }, { status: 500 });
  }

  return NextResponse.json({ organization: data });
}
