import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { isOrganizationRole } from "../../../../lib/organizations/permissions";

// Deliberately GET-only. A company can see what an employee has published on
// their corporate identity card (for brand/compliance oversight and support),
// but never edit it on the employee's behalf — the card is the employee's own
// personal content (photo, bio, social links) and only they can change it.
// Locked fields (company name/title/email/phone) are the one exception, and
// those are already enforced centrally via organization_card_templates, not
// through this endpoint.

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

async function manager(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status,department").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  return data && data.status === "ACTIVE" && isOrganizationRole(data.role) && ["OWNER", "ADMIN", "HR"].includes(data.role) ? data : null;
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const memberId = request.nextUrl.searchParams.get("memberId");
  if (!organizationId || !memberId) return NextResponse.json({ error: "Şirket ve çalışan seçimi gerekli." }, { status: 400 });

  const actor = await manager(ctx.admin, ctx.user.id, organizationId);
  if (!actor) return NextResponse.json({ error: "Çalışan kartını görme yetkin yok." }, { status: 403 });

  const { data: member, error: memberError } = await ctx.admin
    .from("organization_members")
    .select("id,user_id,email,full_name,role,department")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (memberError) return NextResponse.json({ error: "Çalışan bulunamadı." }, { status: 500 });
  if (!member) return NextResponse.json({ error: "Çalışan bulunamadı." }, { status: 404 });
  const { data: identityChanges, error: identityChangesError } = await ctx.admin
    .from("member_identity_change_log")
    .select("id,field,old_value,new_value,changed_at")
    .eq("organization_id", organizationId)
    .eq("member_id", memberId)
    .order("changed_at", { ascending: false })
    .limit(50);
  if (identityChangesError) return NextResponse.json({ error: "Kimlik değişiklik geçmişi yüklenemedi." }, { status: 500 });

  if (!member.user_id) return NextResponse.json({ profiles: [], physicalCards: [], identityChanges: identityChanges || [] });

  // Only return profiles that are physically assigned to this organization.
  // This prevents an employee's unrelated personal/other-company card from
  // leaking into the corporate preview when the same auth account owns more
  // than one Yenomi ID profile.
  const { data: assignedCards, error: assignedError } = await ctx.admin
    .from("physical_cards")
    .select("id,owner_profile_id,status,card_code")
    .eq("organization_id", organizationId)
    .eq("owner_user_id", member.user_id)
    .not("owner_profile_id", "is", null);
  if (assignedError) return NextResponse.json({ error: "Kurumsal kart eşleşmesi yüklenemedi." }, { status: 500 });
  const physicalCards = (assignedCards || []).map((row) => ({ id: row.id, status: row.status, hasProfile: Boolean(row.owner_profile_id) }));

  const profileIds = Array.from(new Set((assignedCards || []).map((row) => row.owner_profile_id).filter(Boolean))) as string[];

  let profileQuery = ctx.admin
    .from("card_profiles")
    .select("id,slug,public_id,name,role,company,phone,whatsapp,email,website,linkedin,instagram,location,image_url,bio,is_published,updated_at")
    .eq("user_id", member.user_id);

  if (profileIds.length) {
    profileQuery = profileQuery.in("id", profileIds);
  } else {
    // Phase 19: corporate profiles are explicitly organization-bound. This
    // prevents another card owned by the same auth user from leaking into a
    // manager preview before any physical NFC card has been assigned.
    profileQuery = profileQuery.eq("organization_id", organizationId);
  }

  const { data: profiles, error: profileError } = await profileQuery.order("updated_at", { ascending: false });
  if (profileError) return NextResponse.json({ error: "Kart yüklenemedi." }, { status: 500 });

  return NextResponse.json({ profiles: profiles || [], physicalCards, identityChanges: identityChanges || [] });
}
