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

export const ROLE_CAPABILITY_CATEGORIES = [
  { id: "company", label: "Şirket & lisans yönetimi", description: "Şirketin ticari ve abonelik ayarları." },
  { id: "team", label: "Ekip & üye yönetimi", description: "Davet, rol ve üyelik yaşam döngüsü işlemleri." },
  { id: "card", label: "Kart & şablon yönetimi", description: "Kurumsal kart deneyimi ve marka standartları." },
  { id: "insights", label: "Analitik & networking", description: "Görünürlük, raporlama ve bağlantı operasyonları." },
] as const;

export type RoleCapabilityCategory = (typeof ROLE_CAPABILITY_CATEGORIES)[number]["id"];
export type RoleCapabilityScope = "COMPANY" | "SELF";

export type RoleCapability = {
  label: string;
  category: RoleCapabilityCategory;
  scope: RoleCapabilityScope;
  allows: (role: OrganizationRole) => boolean;
};

export const ROLE_CAPABILITIES: RoleCapability[] = [
  {
    label: "Şirket, abonelik ve faturalandırma ayarları",
    category: "company",
    scope: "COMPANY",
    allows: (role) => role === "OWNER",
  },
  {
    // Every non-EMPLOYEE role can invite at least one kind of member.
    label: "Çalışan davet etme",
    category: "team",
    scope: "COMPANY",
    allows: (role) => canInviteRole(role, "EMPLOYEE"),
  },
  {
    label: "Yönetici davet etme",
    category: "team",
    scope: "COMPANY",
    allows: (role) => canInviteRole(role, "ADMIN"),
  },
  {
    // Changing another member's role requires outranking them; HR cannot
    // outrank an EMPLOYEE→ADMIN promotion, so it is measured against ADMIN.
    label: "Rol değiştirme",
    category: "team",
    scope: "COMPANY",
    allows: (role) => canChangeMemberStatus(role, "HR", false),
  },
  {
    label: "Çalışanı pasife alma / çıkarma",
    category: "team",
    scope: "COMPANY",
    allows: (role) => canChangeMemberStatus(role, "EMPLOYEE", false),
  },
  {
    label: "Kurumsal şablon yönetimi",
    category: "card",
    scope: "COMPANY",
    allows: (role) => canManageTemplates(role, "ACTIVE"),
  },
  {
    label: "Kurumsal analitik görüntüleme",
    category: "insights",
    scope: "COMPANY",
    allows: (role) => ORGANIZATION_READER_ROLES.includes(role),
  },
  {
    label: "Fiziksel kart yönetimi",
    category: "card",
    scope: "COMPANY",
    allows: (role) => ORGANIZATION_READER_ROLES.includes(role),
  },
  {
    label: "Çalışan kartını görüntüleme (salt okunur)",
    category: "card",
    scope: "COMPANY",
    allows: (role) => MEMBER_CARD_READER_ROLES.includes(role),
  },
  {
    label: "Kendi kartını görüntüleme / düzenleme",
    category: "card",
    scope: "SELF",
    allows: () => true,
  },
  {
    label: "Networking lead ve görüşme yönetimi",
    category: "insights",
    scope: "COMPANY",
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
