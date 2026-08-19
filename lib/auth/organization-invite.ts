import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationInviteResult =
  | { status: "needs-login" }
  | { status: "accepted"; organizationId: string | null }
  | { status: "error"; message: string };

/**
 * `/kurumsal/davet` sayfasının tek karar noktası: aktif bir oturum var mı,
 * varsa URL'deki `token`'ı `/api/organizations/invite/accept`'e gönderip
 * daveti kabul etmeyi dener.
 *
 * Route component'inden çıkarıldı ki (a) unit test edilebilsin, (b) sayfa
 * yalnızca dönen durumu render etsin — iş mantığı ve JSX birbirine
 * karışmasın (önceki sürümde tek satırlık, tek harfli değişken adlarıyla
 * yazılmış bir effect içindeydi).
 */
export async function acceptOrganizationInvite(
  supabase: SupabaseClient | null,
  token: string | null,
): Promise<OrganizationInviteResult> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const session = data.session;
  if (!session) return { status: "needs-login" };

  const response = await fetch("/api/organizations/invite/accept", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ token }),
  });
  const payload = (await response.json()) as { organizationId?: string; error?: string };

  if (response.ok) return { status: "accepted", organizationId: payload.organizationId ?? null };
  return { status: "error", message: payload.error || "Davet kabul edilemedi." };
}
