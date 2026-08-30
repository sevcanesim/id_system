import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canRenameOrganization, isOrganizationRole } from "../../../../lib/organizations/permissions";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

// Şirketin görünen adını (organizations.name) değiştirir. Kurumsal kartların
// VCF çıktısı `card_profiles.company` alanından üretildiği için, organizasyon
// adı değiştiğinde organizasyon adını kullanan mevcut kart profilleri de aynı
// işlem içinde senkronize edilir. Özel bir şirket adı yazılmış profiller
// korunur; yalnızca eski organizasyon adını kullanan veya şirket alanı boş olan
// profiller güncellenir. Şablon rengi/logosundan farklı olarak bu işlemi
// yalnızca OWNER yapabilir.

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

  const { data: currentOrganization, error: currentOrganizationError } = await ctx.admin
    .from("organizations")
    .select("id,name")
    .eq("id", parsed.data.organizationId)
    .maybeSingle();

  if (currentOrganizationError || !currentOrganization) {
    return NextResponse.json({ error: "Şirket bilgisi okunamadı." }, { status: 404 });
  }

  const previousName = String(currentOrganization.name || "").trim();
  const nextName = parsed.data.name.trim();

  if (previousName === nextName) {
    const { data: unchanged } = await ctx.admin
      .from("organizations")
      .select("id,name,slug,status")
      .eq("id", parsed.data.organizationId)
      .single();
    return NextResponse.json({ organization: unchanged, syncedProfiles: 0 });
  }

  const { data: profiles, error: profilesError } = await ctx.admin
    .from("card_profiles")
    .select("id,company")
    .eq("organization_id", parsed.data.organizationId);

  if (profilesError) {
    return NextResponse.json({ error: "Kurumsal kartlar okunamadı." }, { status: 500 });
  }

  const profileIdsToSync = (profiles || [])
    .filter((profile) => {
      const company = typeof profile.company === "string" ? profile.company.trim() : "";
      return !company || company === previousName;
    })
    .map((profile) => profile.id);

  const { data, error } = await ctx.admin
    .from("organizations")
    .update({ name: nextName })
    .eq("id", parsed.data.organizationId)
    .select("id,name,slug,status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Şirket adı güncellenemedi." }, { status: 500 });
  }

  if (profileIdsToSync.length > 0) {
    const { error: profileSyncError } = await ctx.admin
      .from("card_profiles")
      .update({ company: nextName })
      .in("id", profileIdsToSync)
      .eq("organization_id", parsed.data.organizationId);

    if (profileSyncError) {
      await ctx.admin
        .from("organizations")
        .update({ name: previousName })
        .eq("id", parsed.data.organizationId);
      return NextResponse.json({ error: "Şirket adı kart profillerine yansıtılamadı. Değişiklik geri alındı." }, { status: 500 });
    }
  }

  return NextResponse.json({ organization: data, syncedProfiles: profileIdsToSync.length });
}
