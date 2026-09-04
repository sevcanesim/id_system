import {
  ORGANIZATION_ROLES,
  canInviteRole,
  canManageTemplates,
  canManageNetworking,
  canChangeMemberStatus,
  type OrganizationRole,
} from "./permissions";

// The corporate panel used to render a hard-coded role/permission table. It
// drifted from the real authorization rules (it claimed HR could not view
// analytics or manage physical cards, while the API routes allow exactly
// that). This module derives the displayed matrix from the same predicates
// the API enforces, so the panel can no longer state something the server
// disagrees with.
//
// Capabilities that are gated by an explicit role list inside an API route
// (rather than by a predicate in permissions.ts) are declared here with that
// same list, and the accompanying test asserts the two stay in sync.

/** Roles allowed to read organization-wide member data, analytics and cards. */
export const ORGANIZATION_READER_ROLES: OrganizationRole[] = ["OWNER", "ADMIN", "HR"];
export const MEMBER_CARD_READER_ROLES: OrganizationRole[] = ["OWNER", "ADMIN", "HR"];

export type RoleCapability = {
  label: string;
  allows: (role: OrganizationRole) => boolean;
};

export const ROLE_CAPABILITIES: RoleCapability[] = [
  {
    label: "Şirket ve abonelik ayarları",
    allows: (role) => role === "OWNER",
  },
  {
    // Every non-EMPLOYEE role can invite at least one kind of member.
    label: "Çalışan davet etme",
    allows: (role) => canInviteRole(role, "EMPLOYEE"),
  },
  {
    label: "Yönetici davet etme",
    allows: (role) => canInviteRole(role, "ADMIN"),
  },
  {
    // Changing another member's role requires outranking them; HR cannot
    // outrank an EMPLOYEE→ADMIN promotion, so it is measured against ADMIN.
    label: "Rol değiştirme",
    allows: (role) => canChangeMemberStatus(role, "HR", false),
  },
  {
    label: "Çalışanı pasife alma / çıkarma",
    allows: (role) => canChangeMemberStatus(role, "EMPLOYEE", false),
  },
  {
    label: "Kurumsal şablon yönetimi",
    allows: (role) => canManageTemplates(role, "ACTIVE"),
  },
  {
    label: "Kurumsal analitik görüntüleme",
    allows: (role) => ORGANIZATION_READER_ROLES.includes(role),
  },
  {
    label: "Fiziksel kart yönetimi",
    allows: (role) => ORGANIZATION_READER_ROLES.includes(role),
  },
  {
    label: "Çalışan kartını görüntüleme (salt okunur)",
    allows: (role) => MEMBER_CARD_READER_ROLES.includes(role),
  },
  {
    label: "Kendi kartını görüntüleme / düzenleme",
    allows: () => true,
  },
  {
    label: "Networking lead ve görüşme yönetimi",
    allows: (role) => canManageNetworking(role, "ACTIVE"),
  },
];

export const ROLE_MATRIX_COLUMNS = ORGANIZATION_ROLES;

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: "Şirket Sahibi",
  ADMIN: "Kurumsal Yönetici",
  HR: "İK Yöneticisi",
  EMPLOYEE: "Çalışan",
};

/** Capability copy for the corporate roles surface. Super Admin is platform-only. */
export const ROLE_GUIDES: Record<OrganizationRole, readonly string[]> = {
  OWNER: [
    "Şirket ayarlarını yönetir.",
    "Lisans satın alır.",
    "Çalışan ekler.",
    "Kart atar.",
    "Şablon belirler.",
  ],
  ADMIN: [
    "Lisans satın alır.",
    "Çalışan ekler.",
    "Kart atar.",
    "Şablon belirler.",
    "Şirket adını değiştiremez.",
  ],
  HR: [
    "Çalışan ekler.",
    "Davet gönderir.",
    "Kart atar.",
    "Çalışan durumunu değiştirir.",
  ],
  EMPLOYEE: [
    "Yalnız kendi dijital kartını düzenleyebilir.",
    "Kendi istatistiklerini görebilir.",
  ],
};
