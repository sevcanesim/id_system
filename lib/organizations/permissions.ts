export const ORGANIZATION_ROLES = ["OWNER", "ADMIN", "HR", "EMPLOYEE"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

const roleRank: Record<OrganizationRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  HR: 2,
  EMPLOYEE: 1,
};

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return typeof value === "string" && ORGANIZATION_ROLES.includes(value as OrganizationRole);
}

export function canReadOrganization(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && roleRank[role] >= roleRank.EMPLOYEE;
}

export const ORGANIZATION_MANAGEMENT_ROLES = ["OWNER", "ADMIN", "HR"] as const;

export function isManagementRole(role: string): role is OrganizationRole {
  return (ORGANIZATION_MANAGEMENT_ROLES as readonly string[]).includes(role);
}

export function canViewOrganizationCards(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && isManagementRole(role);
}

export function canManageTemplates(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && roleRank[role] >= roleRank.ADMIN;
}

export const NETWORKING_MANAGER_ROLES = ["OWNER", "ADMIN"] as const;

export function canManageNetworking(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && (NETWORKING_MANAGER_ROLES as readonly string[]).includes(role);
}

// Commercial history exposes invoice and payment information. It is kept out
// of operational administrator accounts: only the legal owner and HR can
// inspect it, while only the owner may initiate a new paid transaction.
export function canViewCorporateCommerce(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && (role === "OWNER" || role === "HR");
}

export function canPurchaseCorporateCommerce(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && role === "OWNER";
}

// Legal/tax and billing identity affects invoices and commercial records.
// It is intentionally stricter than operational administration: only the
// organization owner may maintain this legally binding profile.
export function canManageOrganizationLegalProfile(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && role === "OWNER";
}

// Şirketin resmi/görünen adını değiştirmek, şablon rengi seçmekten farklı bir
// ağırlıkta bir işlem: bu isim her çalışan kartının "Şirket" alanına
// (lockCompany kilitli/öneri olduğunda) ve genel kart sayfalarına yayılır.
// Bu yüzden ADMIN dahil değil, yalnızca OWNER değiştirebilir.
export function canRenameOrganization(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && role === "OWNER";
}

export function canInviteRole(actorRole: OrganizationRole, invitedRole: Exclude<OrganizationRole, "OWNER">) {
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN") return invitedRole !== "ADMIN";
  if (actorRole === "HR") return invitedRole === "EMPLOYEE";
  return false;
}

export function canManageMemberIdentity(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
  isSelf: boolean,
) {
  if (actorRole === "OWNER") return isSelf || roleRank[actorRole] > roleRank[targetRole];
  if (isSelf || targetRole === "OWNER") return false;
  return roleRank[actorRole] > roleRank[targetRole];
}

export function canChangeMemberStatus(actorRole: OrganizationRole, targetRole: OrganizationRole, isSelf: boolean) {
  if (isSelf || targetRole === "OWNER") return false;
  return roleRank[actorRole] > roleRank[targetRole];
}

export function normalizeOrganizationRole(value: unknown): OrganizationRole | null {
  if (value === "HR_MANAGER") return "HR";
  return isOrganizationRole(value) ? value : null;
}
