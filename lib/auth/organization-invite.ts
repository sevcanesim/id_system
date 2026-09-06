import { getBrowserIdentity } from "./browser-identity";

export type OrganizationInviteResult =
  | { status: "needs-login" }
  | { status: "accepted"; organizationId: string | null }
  | { status: "error"; message: string };

export async function acceptOrganizationInvite(
  token: string | null,
): Promise<OrganizationInviteResult> {
  if (!token) return { status: "error", message: "Davet bağlantısı geçersiz." };
  if (!(await getBrowserIdentity())) return { status: "needs-login" };

  const response = await fetch("/api/organizations/invite/accept", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const payload = (await response.json()) as { organizationId?: string; error?: string };

  if (response.ok) return { status: "accepted", organizationId: payload.organizationId ?? null };
  return { status: "error", message: payload.error || "Davet kabul edilemedi." };
}
