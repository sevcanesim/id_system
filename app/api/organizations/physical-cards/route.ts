import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient, getSupabaseAuthClient, getSupabaseUserClient } from "../../../../lib/supabase/server-admin";
import { canViewOrganizationCards, isOrganizationRole } from "../../../../lib/organizations/permissions";

const patchSchema = z.object({
  organizationId: z.string().uuid(),
  cardId: z.string().uuid(),
  status: z.enum(["ACTIVE", "DISABLED"]),
});

const replacementSchema = z.object({
  organizationId: z.string().uuid(),
  oldCardId: z.string().uuid(),
  newCardId: z.string().uuid(),
});

async function context(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const auth = getSupabaseAuthClient();
  const { data } = await auth.auth.getUser(token);
  if (!data.user) return null;
  return { user: data.user, token, admin: getSupabaseAdminClient() };
}

async function manager(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status,department").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  return data && data.status === "ACTIVE" && isOrganizationRole(data.role) && ["OWNER", "ADMIN", "HR"].includes(data.role) ? data : null;
}

async function cardViewer(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string, organizationId: string) {
  const { data } = await admin.from("organization_members").select("role,status,department").eq("organization_id", organizationId).eq("user_id", userId).maybeSingle();
  return data && isOrganizationRole(data.role) && canViewOrganizationCards(data.role, data.status) ? data : null;
}

// GET: physical NFC card status for every employee in the organization who
// has one. Card codes are masked (last 4 characters only) — a full code can
// activate an unassigned card, so the admin overview never exposes it.
export async function GET(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) return NextResponse.json({ error: "Şirket seçimi gerekli." }, { status: 400 });
  const actor = await cardViewer(ctx.admin, ctx.user.id, organizationId);
  if (!actor) return NextResponse.json({ error: "Fiziksel kartları görme yetkin yok." }, { status: 403 });

  const { data, error } = await ctx.admin
    .from("physical_cards")
    .select("id,card_code,status,owner_user_id,activated_at,lost_at,disabled_at,replaced_by_card_id")
    .eq("organization_id", organizationId)
    .order("activated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Kartlar yüklenemedi." }, { status: 500 });

  const ownerIds = [...new Set((data || []).map((card) => card.owner_user_id).filter(Boolean))] as string[];
  let ownersQuery = ownerIds.length
    ? ctx.admin.from("organization_members").select("user_id,full_name,email").eq("organization_id", organizationId).in("user_id", ownerIds)
    : null;
  if (ownersQuery && actor.role === "DEPARTMENT_MANAGER") {
    ownersQuery = ownersQuery.eq("department", actor.department as string);
  }
  const { data: owners } = ownersQuery ? await ownersQuery : { data: [] };
  const ownerByUserId = new Map((owners || []).map((owner) => [owner.user_id, owner.full_name || owner.email]));

  const cards = (data || []).map((card) => ({
    id: card.id,
    cardCodeMasked: `••••${card.card_code.slice(-4)}`,
    status: card.status,
    ownerUserId: card.owner_user_id,
    ownerName: card.owner_user_id ? ownerByUserId.get(card.owner_user_id) || "Çalışan adı bulunamadı" : null,
    activatedAt: card.activated_at,
    lostAt: card.lost_at,
    disabledAt: card.disabled_at,
    replacedByCardId: card.replaced_by_card_id,
  })).filter((card) => {
    if (actor.role !== "DEPARTMENT_MANAGER") return true;
    return Boolean(card.ownerUserId && ownerByUserId.has(card.ownerUserId));
  });
  return NextResponse.json({ cards });
}

// PATCH: enable/disable a card. Routed through change_physical_card_status,
// called with the acting user's own JWT (not the service-role client) so the
// function's internal auth.uid()-based manager check applies as a second,
// database-level authorization layer on top of the API-level check above.
export async function PATCH(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  const actor = await manager(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!actor) return NextResponse.json({ error: "Kart durumunu değiştirme yetkin yok." }, { status: 403 });

  const userClient = getSupabaseUserClient(ctx.token);
  const { data, error } = await userClient.rpc("change_physical_card_status", {
    p_card_id: parsed.data.cardId,
    p_status: parsed.data.status,
  });
  if (error) {
    const message = error.message?.includes("ONLY_ORGANIZATION_MANAGER_CAN_DISABLE")
      ? "Bu kartı yalnızca şirket yöneticisi devre dışı bırakabilir."
      : error.message?.includes("CARD_ACCESS_DENIED")
        ? "Bu karta erişim yetkin yok."
        : "Kart durumu güncellenemedi.";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ card: data });
}


// POST: permanently link an inactive/lost card to a newly activated replacement.
// The database function enforces same owner/profile and prevents reusing an old
// card after replacement. API-level manager authorization is checked first.
export async function POST(request: NextRequest) {
  const ctx = await context(request);
  if (!ctx) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const parsed = replacementSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.oldCardId === parsed.data.newCardId) {
    return NextResponse.json({ error: "Geçersiz replacement kart seçimi." }, { status: 400 });
  }
  const actor = await manager(ctx.admin, ctx.user.id, parsed.data.organizationId);
  if (!actor) return NextResponse.json({ error: "Replacement kart yönetme yetkin yok." }, { status: 403 });

  const { data: cards, error: cardsError } = await ctx.admin
    .from("physical_cards")
    .select("id,status,owner_user_id,owner_profile_id,organization_id,replaced_by_card_id")
    .in("id", [parsed.data.oldCardId, parsed.data.newCardId]);
  if (cardsError || !cards || cards.length !== 2) return NextResponse.json({ error: "Kartlar bulunamadı." }, { status: 404 });

  const oldCard = cards.find((card) => card.id === parsed.data.oldCardId);
  const newCard = cards.find((card) => card.id === parsed.data.newCardId);
  if (!oldCard || !newCard || oldCard.organization_id !== parsed.data.organizationId || newCard.organization_id !== parsed.data.organizationId) {
    return NextResponse.json({ error: "Kartlar bu şirkete ait değil." }, { status: 403 });
  }
  if (oldCard.owner_user_id !== newCard.owner_user_id || oldCard.owner_profile_id !== newCard.owner_profile_id) {
    return NextResponse.json({ error: "Replacement kart aynı çalışana ve profile ait olmalıdır." }, { status: 409 });
  }
  if (!["LOST", "DISABLED"].includes(oldCard.status) || newCard.status !== "ACTIVE" || oldCard.replaced_by_card_id) {
    return NextResponse.json({ error: "Kartlar replacement için uygun durumda değil." }, { status: 409 });
  }

  const { error } = await ctx.admin.rpc("replace_physical_card", {
    p_old_card_id: oldCard.id,
    p_new_card_id: newCard.id,
  });
  if (error) return NextResponse.json({ error: "Replacement kart bağlantısı tamamlanamadı." }, { status: 409 });
  return NextResponse.json({ ok: true, oldCardId: oldCard.id, newCardId: newCard.id });
}
