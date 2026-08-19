import type { CardBranding, EditableCardData } from "../../CardTemplate";

export type LockMode = "free" | "suggested" | "locked";

export type OrgLock = {
  organizationId: string;
  organizationName: string;
  membershipRole: string;
  planName: string;
  seatLimit: number | null;
  lockCompany: LockMode;
  lockTitle: LockMode;
  lockEmail: LockMode;
  lockPhone: LockMode;
  lockName: LockMode;
  jobTitles: string[];
  titleRequest: { requestedTitle: string; status: "PENDING" | "APPROVED" | "REJECTED"; note: string | null } | null;
};

type CardData = EditableCardData;

type OrganizationIdentity = {
  lock: OrgLock;
  lockedValues: Partial<CardData>;
  suggestedValues: Partial<CardData>;
  branding: CardBranding;
};

function readLockMode(raw: unknown, fallback: LockMode): LockMode {
  if (raw === true) return "locked";
  if (raw === false) return "free";
  if (raw === "free" || raw === "suggested" || raw === "locked") return raw;
  return fallback;
}

export async function fetchOrganizationIdentity(
  accessToken: string,
  preferredOrganizationId?: string | null,
): Promise<OrganizationIdentity | null> {
  try {
    const mineResponse = await fetch("/api/organizations/mine", { headers: { authorization: `Bearer ${accessToken}` } });
    if (!mineResponse.ok) return null;
    const mine = await mineResponse.json() as { organizations?: Array<{ organization_id: string; role?: string | null; organizations: { name: string } | null; organization_subscriptions?: Array<{ seat_limit?: number | null; business_plans?: { name?: string | null } | null }> }> };
    const org = preferredOrganizationId
      ? mine.organizations?.find((item) => item.organization_id === preferredOrganizationId)
      : mine.organizations?.[0];
    if (!org) return null;

    const [templateResponse, selfResponse, titlesResponse, requestsResponse] = await Promise.all([
      fetch(`/api/organizations/templates?organizationId=${org.organization_id}`, { headers: { authorization: `Bearer ${accessToken}` } }),
      fetch(`/api/organizations/members?organizationId=${org.organization_id}&self=true`, { headers: { authorization: `Bearer ${accessToken}` } }),
      fetch(`/api/organizations/job-titles?organizationId=${org.organization_id}`, { headers: { authorization: `Bearer ${accessToken}` } }),
      fetch(`/api/organizations/title-requests?organizationId=${org.organization_id}`, { headers: { authorization: `Bearer ${accessToken}` } }),
    ]);

    const templateRow = templateResponse.ok
      ? ((await templateResponse.json()).templates?.[0] as { fields?: Record<string, string | boolean>; primary_color?: string | null; logo_url?: string | null } | undefined)
      : undefined;
    const fields = templateRow?.fields ?? {};
    const self = selfResponse.ok
      ? ((await selfResponse.json()).member as { title?: string | null; department?: string | null; email?: string | null } | undefined)
      : undefined;
    const jobTitles = titlesResponse.ok
      ? ((await titlesResponse.json()).titles as Array<{ title: string }> | undefined)?.map((t) => t.title) ?? []
      : [];
    const latestRequest = requestsResponse.ok
      ? ((await requestsResponse.json()).requests?.[0] as { requested_title: string; status: "PENDING" | "APPROVED" | "REJECTED"; note?: string | null } | undefined)
      : undefined;

    const lock: OrgLock = {
      organizationId: org.organization_id,
      organizationName: org.organizations?.name || "",
      membershipRole: org.role || "EMPLOYEE",
      planName: org.organization_subscriptions?.[0]?.business_plans?.name || "Business",
      seatLimit: org.organization_subscriptions?.[0]?.seat_limit ?? null,
      lockCompany: readLockMode(fields.lockCompany, "free"),
      lockTitle: readLockMode(fields.lockTitle, "free"),
      lockEmail: readLockMode(fields.lockEmail, "suggested"),
      lockPhone: readLockMode(fields.lockPhone, "free"),
      lockName: readLockMode(fields.lockName, "suggested"),
      jobTitles,
      titleRequest: latestRequest
        ? { requestedTitle: latestRequest.requested_title, status: latestRequest.status, note: latestRequest.note || null }
        : null,
    };

    const lockedValues: Partial<CardData> = {};
    const suggestedValues: Partial<CardData> = {};
    if (lock.organizationName) {
      if (lock.lockCompany === "locked") lockedValues.company = lock.organizationName;
      else if (lock.lockCompany === "suggested") suggestedValues.company = lock.organizationName;
    }
    if (self?.title) {
      if (lock.lockTitle === "locked") lockedValues.role = self.title;
      else if (lock.lockTitle === "suggested") suggestedValues.role = self.title;
    }
    if (self?.email) {
      if (lock.lockEmail === "locked") lockedValues.email = self.email;
      else if (lock.lockEmail === "suggested") suggestedValues.email = self.email;
    }
    if (typeof fields.phone === "string" && fields.phone) {
      if (lock.lockPhone === "locked") lockedValues.phone = fields.phone;
      else if (lock.lockPhone === "suggested") suggestedValues.phone = fields.phone;
    }

    const branding: CardBranding = {
      logoUrl: templateRow?.logo_url ?? null,
      primaryColor: templateRow?.primary_color ?? null,
      companyName: lock.organizationName || null,
      variant: (typeof fields.templateVariant === "string" && ["ESSENTIAL", "PROFESSIONAL", "EXECUTIVE", "CLASSIC", "MINIMAL"].includes(fields.templateVariant)
        ? fields.templateVariant === "CLASSIC" ? "ESSENTIAL" : fields.templateVariant === "MINIMAL" ? "PROFESSIONAL" : fields.templateVariant
        : "ESSENTIAL") as CardBranding["variant"],
    };

    return { lock, lockedValues, suggestedValues, branding };
  } catch {
    return null;
  }
}
