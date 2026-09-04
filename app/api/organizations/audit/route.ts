import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganizationRole } from "../../../../lib/organizations/authorization";
import { getSupabaseAdminClient } from "../../../../lib/supabase/server-admin";

const querySchema = z.object({
  organizationId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse({
    organizationId: request.nextUrl.searchParams.get("organizationId"),
    limit: request.nextUrl.searchParams.get("limit") || undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Geçerli bir şirket seçimi gerekli." }, { status: 400 });

  const actor = await requireOrganizationRole(request, parsed.data.organizationId, ["OWNER", "ADMIN", "HR"]);
  if (!actor) return NextResponse.json({ error: "Denetim kayıtlarını görme yetkin yok." }, { status: 403 });

  const admin = getSupabaseAdminClient();
  const [{ data: events, error }, { data: members, error: membersError }] = await Promise.all([
    admin
      .from("organization_audit_events")
      .select("id,actor_user_id,actor_role,action,subject_type,subject_id,summary,metadata,occurred_at")
      .eq("organization_id", parsed.data.organizationId)
      .order("occurred_at", { ascending: false })
      .limit(parsed.data.limit),
    admin
      .from("organization_members")
      .select("user_id,full_name,email")
      .eq("organization_id", parsed.data.organizationId),
  ]);

  if (error || membersError) {
    const relationMissing = error?.code === "42P01" || error?.code === "PGRST205";
    if (relationMissing) {
      return NextResponse.json({
        events: [],
        migrationPending: true,
        message: "Denetim kaydı altyapısı bu ortamda henüz etkinleştirilmedi.",
      });
    }
    return NextResponse.json({ error: "Denetim kayıtları yüklenemedi." }, { status: 500 });
  }

  const names = new Map(
    (members || [])
      .filter((member) => Boolean(member.user_id))
      .map((member) => [member.user_id as string, member.full_name || member.email || "Kurumsal kullanıcı"]),
  );
  const occurredAt = (events || []).map((event) => new Date(event.occurred_at).getTime()).filter(Number.isFinite);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  return NextResponse.json({
    events: (events || []).map((event) => ({
      ...event,
      actor_name: event.actor_user_id ? names.get(event.actor_user_id) || "Kurumsal kullanıcı" : "Sistem",
    })),
    summary: {
      total: (events || []).length,
      last30Days: occurredAt.filter((value) => value >= thirtyDaysAgo).length,
      viewerRole: actor.role,
    },
    migrationPending: false,
  });
}
