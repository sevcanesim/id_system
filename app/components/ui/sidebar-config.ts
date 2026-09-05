import type { IconName } from "../../icons";
import { normalizeOrganizationRole, type OrganizationRole } from "../../../lib/organizations/permissions";
import type { SidebarAvailability } from "./sidebar.types";

export type SidebarRole = OrganizationRole | "HR_MANAGER";

export type SidebarConfigItem = {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  group?: string;
  activeWhen?: string[];
  /** Feature availability is presentation state only; current-route state is resolved separately. */
  availability?: SidebarAvailability;
  disabledReason?: string;
  /** UI visibility; server/RLS/API authorization remains authoritative. */
  roles?: readonly SidebarRole[];
};

const CORPORATE_ADMIN: readonly SidebarRole[] = ["OWNER", "ADMIN"];
const CORPORATE_MANAGEMENT: readonly SidebarRole[] = ["OWNER", "ADMIN", "HR", "HR_MANAGER"];
const CORPORATE_ADMIN_OR_HR: readonly SidebarRole[] = ["OWNER", "ADMIN", "HR", "HR_MANAGER"];

export const CORPORATE_SIDEBAR_CONFIG = [
  { key: "overview", href: "/kurumsal/panel", label: "Genel Bakış", icon: "building", group: "GENEL" },
  { key: "employees", href: "/kurumsal/panel/calisanlar", label: "Ekip & Kartlar", icon: "users", group: "EKİP", roles: CORPORATE_MANAGEMENT },
  { key: "roles", href: "/kurumsal/panel/roller", label: "Roller & Yetkiler", icon: "lock", group: "EKİP", roles: CORPORATE_ADMIN },
  { key: "organization", href: "/kurumsal/panel/organizasyon", label: "Organizasyon", icon: "building", group: "EKİP", roles: CORPORATE_ADMIN },
  { key: "content", href: "/kurumsal/panel/icerik", label: "Dokümanlar & İçerik", icon: "link", group: "ŞİRKET", roles: CORPORATE_ADMIN },
  { key: "audit", href: "/kurumsal/panel/denetim", label: "Güvenlik & Denetim", icon: "shield", group: "ŞİRKET", roles: CORPORATE_MANAGEMENT },
  { key: "integrations", href: "/kurumsal/panel/entegrasyonlar", label: "Entegrasyonlar", icon: "link", group: "ŞİRKET", roles: CORPORATE_ADMIN },
  { key: "analytics", href: "/kurumsal/panel/istatistikler", label: "İstatistikler", icon: "analytics", group: "NETWORKING", roles: CORPORATE_ADMIN_OR_HR },
  { key: "leads", href: "/kurumsal/panel/leadler", label: "Network Mail & Leadler", icon: "mail", group: "NETWORKING", roles: CORPORATE_ADMIN },
  { key: "events", href: "/kurumsal/panel/etkinlikler", label: "Etkinlikler", icon: "clock", group: "NETWORKING", roles: CORPORATE_ADMIN },
  { key: "meetings", href: "/kurumsal/panel/gorusmeler", label: "Görüşmeler", icon: "headset", group: "NETWORKING", roles: CORPORATE_ADMIN },
  { key: "capacity", href: "/kurumsal/panel/lisans", label: "Paket & Kapasite", icon: "box", group: "TİCARİ", roles: CORPORATE_ADMIN },
  { key: "card", href: "/kurumsal/panel/kartim", label: "Kartım", icon: "id", group: "KİŞİSEL" },
  { key: "settings", href: "/kurumsal/panel/ayarlar", label: "Ayarlar", icon: "adjustments", group: "HESAP", roles: CORPORATE_ADMIN },
] satisfies readonly SidebarConfigItem[];

export const INDIVIDUAL_SIDEBAR_CONFIG = [
  { key: "home", href: "/kartim", label: "Kartım & Genel Bakış", icon: "id", group: "KARTIM" },
  { key: "studio", href: "/olustur", label: "Kimlik Stüdyosu", icon: "pencil", group: "KİMLİK" },
  { key: "connections", href: "/leadler", label: "Network Mail", icon: "mail", group: "BAĞLANTILAR" },
  { key: "account", href: "/ayarlar", label: "Hesap & Abonelik", icon: "adjustments", group: "HESAP" },
] satisfies readonly SidebarConfigItem[];

export function normalizeSidebarRole(role?: string | null): OrganizationRole | null {
  return normalizeOrganizationRole(role);
}

function sidebarRoleAllowed(itemRoles: readonly SidebarRole[] | undefined, role?: string | null): boolean {
  if (!itemRoles) return true;
  const normalized = normalizeSidebarRole(role);
  if (!normalized) return false;
  if (itemRoles.includes(normalized)) return true;
  return normalized === "HR" && itemRoles.includes("HR_MANAGER");
}

export function filterSidebarByRole<T extends SidebarConfigItem>(items: readonly T[], role?: string | null): T[] {
  if (!role) return [...items];
  const normalized = normalizeSidebarRole(role);
  if (!normalized) return [];
  return items.filter((item) => sidebarRoleAllowed(item.roles, role));
}

export type SidebarItemGroup<T extends { group?: string }> = {
  name: string;
  items: T[];
};

export function groupSidebarItems<T extends { group?: string }>(items: readonly T[]): SidebarItemGroup<T>[] {
  const groups: SidebarItemGroup<T>[] = [];
  for (const item of items) {
    const name = item.group ?? "";
    const last = groups[groups.length - 1];
    if (last && last.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  }
  return groups;
}
