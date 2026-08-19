import type { IconName } from "../../icons";
import { normalizeOrganizationRole, type OrganizationRole } from "../../../lib/organizations/permissions";

export type SidebarRole = OrganizationRole | "HR_MANAGER";
export type SidebarScope = "individual" | "corporate";

export type SidebarConfigItem = {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  group?: string;
  activeWhen?: string[];
  /** UI görünürlüğü; server authorization bunun yerine geçmez. */
  roles?: readonly SidebarRole[];
};

const CORPORATE_ADMIN: readonly SidebarRole[] = ["OWNER", "ADMIN"];
const CORPORATE_MANAGEMENT: readonly SidebarRole[] = ["OWNER", "ADMIN", "HR", "HR_MANAGER", "DEPARTMENT_MANAGER"];
const CORPORATE_ADMIN_OR_HR: readonly SidebarRole[] = ["OWNER", "ADMIN", "HR", "HR_MANAGER"];

export const CORPORATE_SIDEBAR_CONFIG = [
  { key: "overview", href: "/kurumsal/panel", label: "Genel Bakış", icon: "building", group: "GENEL" },
  { key: "employees", href: "/kurumsal/panel/calisanlar", label: "Çalışanlar", icon: "users", group: "EKİP & KARTLAR", roles: CORPORATE_MANAGEMENT },
  { key: "cards", href: "/kurumsal/panel/kartlar", label: "Kartlar", icon: "contact", roles: CORPORATE_MANAGEMENT },
  { key: "templates", href: "/kurumsal/panel/sablon", label: "Marka & Şablon", icon: "contact", group: "MARKA & İÇERİK", roles: CORPORATE_ADMIN },
  { key: "content", href: "/kurumsal/panel/icerik", label: "İçerik", icon: "link", roles: CORPORATE_ADMIN },
  { key: "analytics", href: "/kurumsal/panel/istatistikler", label: "İstatistikler", icon: "analytics", group: "YÖNETİM", roles: CORPORATE_ADMIN_OR_HR },
  { key: "leads", href: "/kurumsal/panel/leadler", label: "Leadler", icon: "users", group: "NETWORKING", roles: CORPORATE_ADMIN },
  { key: "events", href: "/kurumsal/panel/etkinlikler", label: "Etkinlikler", icon: "analytics", roles: CORPORATE_ADMIN },
  { key: "meetings", href: "/kurumsal/panel/gorusmeler", label: "Görüşmeler", icon: "contact", roles: CORPORATE_ADMIN },
  { key: "licenses", href: "/kurumsal/panel/lisans", label: "Lisanslar", icon: "analytics", roles: CORPORATE_ADMIN },
  { key: "organization", href: "/kurumsal/panel/organizasyon", label: "Organizasyon", icon: "building", roles: CORPORATE_ADMIN },
  { key: "roles", href: "/kurumsal/panel/roller", label: "Roller & Yetkiler", icon: "lock", roles: CORPORATE_ADMIN },
  { key: "settings", href: "/kurumsal/panel/ayarlar", label: "Ayarlar", icon: "pencil", roles: CORPORATE_ADMIN },
] satisfies readonly SidebarConfigItem[];

export const INDIVIDUAL_SIDEBAR_CONFIG = [
  { key: "home", href: "/kartlarim", label: "Genel Bakış", icon: "analytics", group: "KİMLİK" },
  { key: "card", href: "/kartim", label: "Dijital Kart", icon: "id", group: "KİMLİK" },
  { key: "edit", href: "/olustur", label: "Kimlik Stüdyosu", icon: "pencil", group: "KİMLİK" },
  { key: "analytics", href: "/istatistikler", label: "İstatistikler", icon: "analytics", group: "İÇGÖRÜLER" },
  { key: "orders", href: "/siparislerim", label: "Siparişlerim", icon: "box", group: "HESAP" },
  { key: "subscription", href: "/yenile", label: "Hizmet", icon: "refresh" },
  { key: "settings", href: "/ayarlar", label: "Ayarlar", icon: "users" },
] satisfies readonly SidebarConfigItem[];

export function normalizeSidebarRole(role?: string | null): OrganizationRole | null {
  return normalizeOrganizationRole(role);
}

function sidebarRoleAllowed(itemRoles: readonly SidebarRole[] | undefined, role?: string | null): boolean {
  if (!itemRoles) return true;
  const normalized = normalizeSidebarRole(role);
  if (!normalized) return false;
  if (itemRoles.includes(normalized)) return true;
  // Persisted DB role is HR; some nav configs still list the HR_MANAGER UI alias.
  return normalized === "HR" && itemRoles.includes("HR_MANAGER");
}

export function filterSidebarByRole<T extends SidebarConfigItem>(items: readonly T[], role?: string | null): T[] {
  if (!role) return [...items];
  const normalized = normalizeSidebarRole(role);
  if (!normalized) return [];
  return items.filter((item) => sidebarRoleAllowed(item.roles, role));
}
