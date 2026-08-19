export const ORGANIZATION_ROLES = ["OWNER", "ADMIN", "HR", "DEPARTMENT_MANAGER", "EMPLOYEE"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

const roleRank: Record<OrganizationRole, number> = {
  OWNER: 5,
  ADMIN: 4,
  HR: 3,
  DEPARTMENT_MANAGER: 2,
  EMPLOYEE: 1,
};

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return typeof value === "string" && ORGANIZATION_ROLES.includes(value as OrganizationRole);
}

export function canReadOrganization(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && roleRank[role] >= roleRank.EMPLOYEE;
}

export const ORGANIZATION_MANAGEMENT_ROLES = ["OWNER", "ADMIN", "HR", "DEPARTMENT_MANAGER"] as const;

export function isManagementRole(role: string): role is OrganizationRole {
  return (ORGANIZATION_MANAGEMENT_ROLES as readonly string[]).includes(role);
}

export function canViewOrganizationCards(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && isManagementRole(role);
}

export function canManageTemplates(role: OrganizationRole, status: string) {
  return status === "ACTIVE" && roleRank[role] >= roleRank.ADMIN;
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
  if (actorRole === "DEPARTMENT_MANAGER") return invitedRole === "EMPLOYEE";
  return false;
}

export function isDepartmentScoped(role: OrganizationRole) {
  return role === "DEPARTMENT_MANAGER";
}

export function canManageMemberInDepartment(
  actorRole: OrganizationRole,
  actorDepartment: string | null | undefined,
  targetRole: OrganizationRole,
  targetDepartment: string | null | undefined,
  isSelf: boolean,
) {
  if (!canChangeMemberStatus(actorRole, targetRole, isSelf)) return false;
  if (!isDepartmentScoped(actorRole)) return true;
  return Boolean(actorDepartment && actorDepartment === targetDepartment && targetRole === "EMPLOYEE");
}

export function canManageMemberIdentity(
  actorRole: OrganizationRole,
  actorDepartment: string | null | undefined,
  targetRole: OrganizationRole,
  targetDepartment: string | null | undefined,
  isSelf: boolean,
) {
  // The company owner is also an organization member and must be able to
  // maintain their own corporate identity. Status/role operations remain
  // protected by canChangeMemberStatus; this permission is identity-only.
  if (actorRole === "OWNER") return isSelf || roleRank[actorRole] > roleRank[targetRole];
  if (isSelf || targetRole === "OWNER") return false;
  if (roleRank[actorRole] <= roleRank[targetRole]) return false;
  if (!isDepartmentScoped(actorRole)) return true;
  return Boolean(actorDepartment && actorDepartment === targetDepartment && targetRole === "EMPLOYEE");
}

export function canChangeMemberStatus(actorRole: OrganizationRole, targetRole: OrganizationRole, isSelf: boolean) {
  if (isSelf || targetRole === "OWNER") return false;
  return roleRank[actorRole] > roleRank[targetRole];
}

/** UI alias accepted by product copy without changing the persisted DB role. */
export type OrganizationUiRole = OrganizationRole | "HR_MANAGER";

export function normalizeOrganizationRole(value: unknown): OrganizationRole | null {
  if (value === "HR_MANAGER") return "HR";
  return isOrganizationRole(value) ? value : null;
}
