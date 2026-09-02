import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "../../../../../../lib/admin/require-admin";

const schema = z.object({
  unitId: z.string().uuid(),
  cardCode: z.string().trim().regex(/^YN-[A-Z0-9]{12}$/i),
});

export async function POST(request: NextRequest) {
  const context = await requireSuperAdmin(request);
  if (!context) return NextResponse.json({ error: "Yönetici yetkisi ve MFA doğrulaması gerekli." }, { status: 403 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz kart veya üretim birimi." }, { status: 400 });

  const cardCode = parsed.data.cardCode.toUpperCase();
  const [{ data: unit, error: unitError }, { data: card, error: cardError }] = await Promise.all([
    context.admin
      .from("commerce_physical_card_units")
      .select("id,order_item_id,physical_card_id")
      .eq("id", parsed.data.unitId)
      .maybeSingle(),
    context.admin
      .from("physical_cards")
      .select("id,card_code,status,owner_user_id,owner_profile_id")
      .eq("card_code", cardCode)
      .maybeSingle(),
  ]);

  if (unitError || !unit) return NextResponse.json({ error: "Üretim birimi bulunamadı." }, { status: 404 });
  if (cardError || !card) return NextResponse.json({ error: "Fiziksel kart bulunamadı." }, { status: 404 });
  if (card.owner_user_id || card.owner_profile_id) {
    return NextResponse.json({ error: "Sahibi atanmış bir kart üretim birimine yeniden bağlanamaz." }, { status: 409 });
  }
  if (unit.physical_card_id && unit.physical_card_id !== card.id) {
    return NextResponse.json({ error: "Bu üretim birimi başka bir fiziksel karta bağlı." }, { status: 409 });
  }

  const { data: conflictingUnit } = await context.admin
    .from("commerce_physical_card_units")
    .select("id")
    .eq("physical_card_id", card.id)
    .neq("id", unit.id)
    .maybeSingle();
  if (conflictingUnit) {
    return NextResponse.json({ error: "Bu fiziksel kart başka bir üretim birimine bağlı." }, { status: 409 });
  }

  const { data: linked, error: linkError } = await context.admin
    .from("commerce_physical_card_units")
    .update({ physical_card_id: card.id })
    .eq("id", unit.id)
    .is("physical_card_id", null)
    .select("id")
    .maybeSingle();
  if (linkError) return NextResponse.json({ error: "Kart provenance bağlantısı kaydedilemedi." }, { status: 500 });
  if (!linked && unit.physical_card_id !== card.id) {
    return NextResponse.json({ error: "Üretim birimi başka bir işlem tarafından değiştirildi." }, { status: 409 });
  }

  await context.admin.from("admin_audit_log").insert({
    actor_user_id: context.user.id,
    action: "PHYSICAL_CARD_PROVENANCE_LINKED",
    target_table: "commerce_physical_card_units",
    target_id: unit.id,
    after_value: { physicalCardId: card.id, cardCode, orderItemId: unit.order_item_id },
  });

  return NextResponse.json({ ok: true, unitId: unit.id, physicalCardId: card.id });
}
