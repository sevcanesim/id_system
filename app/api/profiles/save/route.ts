import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { normalizeCardSlug, validateCardSlug } from "../../../../lib/validation/slug";
import { getSupabaseAdminClient, getSupabaseAuthClient } from "../../../../lib/supabase/server-admin";

// Kart profili yazmanın (oluşturma + düzenleme) tek giriş noktası.
//
// Önceden bu işlem tarayıcıdan doğrudan `card_profiles` tablosuna
// (anon key + RLS ile) yapılıyordu. RLS yalnızca satır sahipliğini
// doğruluyor; şirketin Ayarlar panelinden kilitlediği alanlar (Şirket
// adı, Ünvan, Kurumsal e-posta, Kurumsal telefon, Ad Soyad) yalnızca
// istemci tarafında `disabled` idi — bir çalışan bu kısıtlamayı
// doğrudan bir API isteğiyle atlayabilirdi. Bu route artık service-role
// admin client ile `save_own_card_profile` RPC'sini çağırıyor; kilit ve
// ünvan kataloğu kontrolü sunucuda, istemcinin gönderdiği veriden
// bağımsız olarak uygulanıyor.

const schema = z.object({
  profileId: z.string().uuid().nullable().optional(),
  organizationId: z.string().uuid().nullable().optional(),
  patch: z.object({
    slug: z.string().optional(),
    entitlement_id: z.string().uuid().optional(),
    name: z.string().trim().min(1),
    role: z.string().trim().min(1),
    company: z.string().trim().optional().nullable(),
    phone: z.string().trim().optional().nullable(),
    whatsapp: z.string().trim().optional().nullable(),
    email: z.string().trim().optional().nullable(),
    website: z.string().trim().optional().nullable(),
    linkedin: z.string().trim().optional().nullable(),
    instagram: z.string().trim().optional().nullable(),
    location: z.string().trim().optional().nullable(),
    image_url: z.string().trim().optional().nullable(),
    bio: z.string().trim().max(280).optional().nullable(),
    is_published: z.boolean().optional(),
  }),
});

export async function POST(request: NextRequest) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!bearer) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const auth = getSupabaseAuthClient();
  const { data: authData } = await auth.auth.getUser(bearer);
  if (!authData.user) return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz kart bilgisi." }, { status: 400 });

  const patch = { ...parsed.data.patch } as Record<string, unknown>;
  if (typeof patch.slug === "string") {
    const normalizedSlug = normalizeCardSlug(patch.slug);
    const slugError = validateCardSlug(normalizedSlug);
    if (slugError) return NextResponse.json({ error: slugError }, { status: 400 });
    patch.slug = normalizedSlug;
  }

  const admin = getSupabaseAdminClient();
  if (!parsed.data.profileId && !parsed.data.organizationId) {
    const { data: individualProfiles, error: profileLookupError } = await admin
      .from("card_profiles")
      .select("id")
      .eq("user_id", authData.user.id)
      .is("organization_id", null)
      .limit(1);
    if (profileLookupError) return NextResponse.json({ error: "Mevcut dijital profil kontrol edilemedi." }, { status: 500 });
    if (individualProfiles?.length) {
      return NextResponse.json({ error: "Bireysel hesapta yalnızca bir dijital profil oluşturabilirsin.", code: "INDIVIDUAL_PROFILE_LIMIT" }, { status: 409 });
    }
  }
  const { data, error } = await admin.rpc("save_own_card_profile", {
    p_user_id: authData.user.id,
    p_profile_id: parsed.data.profileId || null,
    p_organization_id: parsed.data.organizationId || null,
    p_patch: patch,
  });
  const result = data as { ok?: boolean; code?: string; profile?: { id: string } } | null;
  if (error || !result?.ok) {
    const code = result?.code;
    if (code === "TITLE_NOT_IN_CATALOG") {
      return NextResponse.json({ error: "Bu ünvan şirketin pozisyon kataloğunda yok. Listeden seç veya yeni ünvan talep et.", code }, { status: 409 });
    }
    if (code === "SLUG_TAKEN") return NextResponse.json({ error: "Bu bağlantı az önce başka biri tarafından alındı.", code }, { status: 409 });
    if (code === "ORG_CONTEXT_REQUIRED") return NextResponse.json({ error: "Bu kurumsal kart yalnız şirket çalışma alanından düzenlenebilir.", code }, { status: 409 });
    if (code === "FORBIDDEN") return NextResponse.json({ error: "Bu şirkette aktif üyeliğin yok.", code }, { status: 403 });
    if (code === "NOT_FOUND") return NextResponse.json({ error: "Kart profili bulunamadı.", code }, { status: 404 });
    if (code === "ENTITLEMENT_REQUIRED" || code === "ENTITLEMENT_INVALID" || code === "ENTITLEMENT_IN_USE") {
      return NextResponse.json({ error: "Bu kart için kullanılabilir bir Yenomi ID hakkın yok.", code }, { status: 403 });
    }
    if (code === "DIGITAL_CARD_LIMIT_REACHED") {
      return NextResponse.json({ error: "Şirketin dijital kart kotası doldu.", code }, { status: 409 });
    }
    if (code === "INDIVIDUAL_PROFILE_LIMIT") {
      return NextResponse.json({ error: "Bireysel hesapta yalnızca bir dijital profil oluşturabilirsin.", code }, { status: 409 });
    }
    return NextResponse.json({ error: "Kartvizit kaydedilemedi.", code }, { status: 500 });
  }
  return NextResponse.json({ profile: result.profile });
}
