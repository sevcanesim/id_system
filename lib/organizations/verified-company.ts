import { getSupabaseAdminClient } from "../supabase/server-admin";

export type PublicCompanyVerification = {
  verified: boolean;
  companyName: string | null;
};

/**
 * This is deliberately a Yenomi record-integrity badge, not a claim that a
 * public authority has verified the company. Tax fields are used only for the
 * server-side decision and are never returned to a public card visitor.
 */
export async function getPublicCompanyVerification(
  organizationId: string | null | undefined,
): Promise<PublicCompanyVerification | null> {
  if (!organizationId) return null;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("organizations")
    .select("name,status,legal_name,tax_number,tax_office")
    .eq("id", organizationId)
    .maybeSingle();
  if (error || !data) return null;

  const completeRecord = Boolean(data.legal_name?.trim() && data.tax_number?.trim() && data.tax_office?.trim());
  return {
    verified: data.status === "ACTIVE" && completeRecord,
    companyName: data.legal_name?.trim() || data.name?.trim() || null,
  };
}
