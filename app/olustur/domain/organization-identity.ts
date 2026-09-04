import type { CardBranding, CardTemplateLink, EditableCardData } from "../../CardTemplate";
import { TITLE_OPTIONS } from "../../../lib/form-standards";

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
  links: CardTemplateLink[];
};

type OrganizationLinkPayload = {
  id: string | null;
  label: string;
  subtitle: string;
  configured: boolean;
  isPublished: boolean;
  publishAt: string | null;
  linkType: string | null;
  url: string | null;
  fileUrl: string | null;
};

function isAvailableToCard(link: OrganizationLinkPayload) {
  if (!link.id || !link.configured || !link.isPublished) return false;
  if (!link.url && !link.fileUrl) return false;
  if (!link.publishAt) return true;
  const publishAt = new Date(link.publishAt).getTime();
  return Number.isFinite(publishAt) && publishAt <= Date.now();
}

function toCardTemplateLink(link: OrganizationLinkPayload): CardTemplateLink {
  return {
    title: link.label,
    subtitle: link.subtitle,
    // Public cards use this endpoint too, so opening a corporate asset keeps
    // access rules and content-interaction analytics in one place.
    href: `/api/organization-links/${link.id}/open`,
    kind: "external",
  };
}

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

    const [templateResponse, selfResponse, linksResponse] = await Promise.all([
      fetch(`/api/organizations/templates?organizationId=${org.organization_id}`, { headers: { authorization: `Bearer ${accessToken}` } }),
      fetch(`/api/organizations/members?organizationId=${org.organization_id}&self=true`, { headers: { authorization: `Bearer ${accessToken}` } }),
      fetch(`/api/organizations/links?organizationId=${org.organization_id}`, { headers: { authorization: `Bearer ${accessToken}` } }),
    ]);

    const templateRow = templateResponse.ok
      ? ((await templateResponse.json()).templates?.[0] as { fields?: Record<string, string | boolean>; primary_color?: string | null; logo_url?: string | null } | undefined)
      : undefined;
    const fields = templateRow?.fields ?? {};
    const self = selfResponse.ok
      ? ((await selfResponse.json()).member as { title?: string | null; department?: string | null; email?: string | null } | undefined)
      : undefined;
    const organizationLinks = linksResponse.ok
      ? (((await linksResponse.json()).links ?? []) as OrganizationLinkPayload[])
      : [];

    const lock: OrgLock = {
      organizationId: org.organization_id,
      organizationName: org.organizations?.name || "",
      membershipRole: org.role || "EMPLOYEE",
      planName: (org.organization_subscriptions?.[0]?.business_plans?.name || "Business").replace(/BUSİNESS/g, "BUSINESS"),
      seatLimit: org.organization_subscriptions?.[0]?.seat_limit ?? null,
      lockCompany: readLockMode(fields.lockCompany, "free"),
      lockTitle: readLockMode(fields.lockTitle, "free"),
      lockEmail: readLockMode(fields.lockEmail, "suggested"),
      lockPhone: readLockMode(fields.lockPhone, "free"),
      lockName: readLockMode(fields.lockName, "suggested"),
      jobTitles: [...TITLE_OPTIONS],
      titleRequest: null,
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
      // Corporate variants remain available for future launch decisions; the
      // active editor and every corporate preview use the approved standard.
      variant: "ESSENTIAL" as CardBranding["variant"],
    };

    return {
      lock,
      lockedValues,
      suggestedValues,
      branding,
      links: organizationLinks.filter(isAvailableToCard).map(toCardTemplateLink),
    };
  } catch {
    return null;
  }
}
