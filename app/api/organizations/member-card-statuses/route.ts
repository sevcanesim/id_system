import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";
import { canViewOrganizationCards, isOrganizationRole } from "../../../../lib/organizations/permissions";
import {
  getDigitalProfileState,
  getInvitationState,
  getPhysicalCardState,
} from "../../../../lib/organizations/lifecycle";

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, admin: getSupabaseAdminClient() };
}

export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });

  const { data: actor } = await ctx.admin.from("organization_members").select("role,status,department").eq("organization_id", organizationId).eq("user_id", ctx.user.id).maybeSingle();
  if (!actor || !isOrganizationRole(actor.role) || !canViewOrganizationCards(actor.role, actor.status)) {
    return NextResponse.json({ error: "Kart durumlarını görme yetkin yok." }, { status: 403 });
  }

  const [{ data: organization }, { data: members, error: memberError }, { data: cards, error: cardError }, { data: invites, error: inviteError }] = await Promise.all([
    ctx.admin.from("organizations").select("name").eq("id", organizationId).maybeSingle(),
    // LEFT is intentionally included: historical members still have digital,
    // physical and invitation lifecycle states that must remain auditable.
    (() => {
      let membersQuery = ctx.admin.from("organization_members").select("id,user_id,status,department").eq("organization_id", organizationId);
      if (actor.role === "DEPARTMENT_MANAGER") membersQuery = membersQuery.eq("department", actor.department as string);
      return membersQuery;
    })(),
    ctx.admin.from("physical_cards").select("id,owner_user_id,owner_profile_id,status,activated_at,replaced_by_card_id").eq("organization_id", organizationId),
    ctx.admin.from("organization_invites").select("member_id,expires_at,used_at,accepted_at,revoked_at,created_at").eq("organization_id", organizationId).order("created_at", { ascending: false }),
  ]);
  if (memberError || cardError || inviteError) return NextResponse.json({ error: "Kart durumları yüklenemedi." }, { status: 500 });

  const userIds = (members || []).map((m) => m.user_id).filter(Boolean) as string[];
  let profiles: Array<{id:string;user_id:string;organization_id:string|null;slug:string;company:string|null;is_published:boolean;card_status:string|null}> = [];
  if (userIds.length) {
    const { data, error } = await ctx.admin.from("card_profiles").select("id,user_id,organization_id,slug,company,is_published,card_status").in("user_id", userIds);
    if (error) return NextResponse.json({ error: "Dijital kart durumları yüklenemedi." }, { status: 500 });
    profiles = data || [];
  }

  type InviteRow = { member_id: string; expires_at: string | null; used_at: string | null; accepted_at: string | null; revoked_at: string | null; created_at: string };
  const latestInviteByMember = new Map<string, InviteRow>();
  for (const invite of invites || []) {
    if (!latestInviteByMember.has(invite.member_id)) latestInviteByMember.set(invite.member_id, invite);
  }

  const statuses = (members || []).map((member) => {
    const memberCards = (cards || []).filter((card) => Boolean(member.user_id) && card.owner_user_id === member.user_id);
    const linkedProfileIds = new Set(memberCards.map((card) => card.owner_profile_id).filter(Boolean));
    const matchingProfiles = profiles.filter((profile) => profile.user_id === member.user_id && (
      linkedProfileIds.has(profile.id) ||
      profile.organization_id === organizationId ||
      // Compatibility fallback for pre-Phase-19 rows that have not been backfilled yet.
      (!profile.organization_id && organization?.name && profile.company?.toLocaleLowerCase("tr") === organization.name.toLocaleLowerCase("tr"))
    ));
    const profile = matchingProfiles.find((p) => p.is_published) || matchingProfiles[0] || null;
    const digitalProfileState = getDigitalProfileState(profile ? {
      hasDigitalCard: true,
      published: Boolean(profile.is_published),
      cardStatus: profile.card_status,
    } : null);
    const physicalCardState = getPhysicalCardState(memberCards.map((card) => ({
      status: card.status,
      ownerUserId: card.owner_user_id,
      activatedAt: card.activated_at,
      replacedByCardId: card.replaced_by_card_id,
    })));
    const invitationState = getInvitationState(latestInviteByMember.get(member.id) ? {
      expiresAt: latestInviteByMember.get(member.id)?.expires_at,
      usedAt: latestInviteByMember.get(member.id)?.used_at,
      acceptedAt: latestInviteByMember.get(member.id)?.accepted_at,
      revokedAt: latestInviteByMember.get(member.id)?.revoked_at,
    } : null);

    return {
      memberId: member.id,
      memberStatus: member.status,
      hasDigitalCard: Boolean(profile),
      profileId: profile?.id || null,
      slug: profile?.slug || null,
      published: Boolean(profile?.is_published),
      digitalProfileState,
      physicalCardState,
      invitationState,
      physicalCardCount: memberCards.length,
      activePhysicalCardCount: memberCards.filter((card) => card.status === "ACTIVE").length,
    };
  });

  return NextResponse.json({ statuses });
}
