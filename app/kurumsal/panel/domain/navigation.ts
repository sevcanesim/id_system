import type { IconName } from "../../../icons";
import { filterSidebarByRole, CORPORATE_SIDEBAR_CONFIG } from "../../../components/ui/sidebar-config";
import { normalizeOrganizationRole } from "../../../../lib/organizations/permissions";

export const CORPORATE_PANEL_TABS = [
  "overview",
  "employees",
  "cards",
  "roles",
  "templates",
  "content",
  "analytics",
  "leads",
  "events",
  "meetings",
  "licenses",
  "organization",
  "settings",
] as const;

export type CorporatePanelTab = (typeof CORPORATE_PANEL_TABS)[number];

export const CORPORATE_PANEL_ROUTE_TO_TAB: Record<string, CorporatePanelTab> = {
  "/kurumsal/panel": "overview",
  "/kurumsal/panel/calisanlar": "employees",
  "/kurumsal/panel/kartlar": "cards",
  "/kurumsal/panel/roller": "roles",
  "/kurumsal/panel/sablon": "templates",
  "/kurumsal/panel/icerik": "content",
  "/kurumsal/panel/istatistikler": "analytics",
  "/kurumsal/panel/leadler": "leads",
  "/kurumsal/panel/etkinlikler": "events",
  "/kurumsal/panel/gorusmeler": "meetings",
  "/kurumsal/panel/lisans": "licenses",
  "/kurumsal/panel/organizasyon": "organization",
  "/kurumsal/panel/ayarlar": "settings",
};

export function isCorporatePanelTab(value: string | null): value is CorporatePanelTab {
  return Boolean(value && (CORPORATE_PANEL_TABS as readonly string[]).includes(value));
}

// Sekme anahtarından rotaya — CORPORATE_PANEL_ROUTE_TO_TAB'ın tersi.
export const CORPORATE_PANEL_TAB_ROUTE: Record<CorporatePanelTab, string> = Object.fromEntries(
  Object.entries(CORPORATE_PANEL_ROUTE_TO_TAB).map(([route, tab]) => [tab, route]),
) as Record<CorporatePanelTab, string>;

// Sidebar'da görünme sırası (CorporatePanelClient'taki mevcut sırayla birebir).
export const CORPORATE_PANEL_TAB_ORDER: readonly CorporatePanelTab[] = [
  "overview",
  "employees",
  "cards",
  "templates",
  "content",
  "analytics",
  "licenses",
  "organization",
  "roles",
  "settings",
  "leads",
  "events",
  "meetings",
];

/**
 * Kurumsal panel sekmelerinin etiketi, ikonu ve (varsa) sidebar grup başlığı.
 * Kurumsal panel (CorporatePanelClient) ve kurumsal kart editörü (CardWizard,
 * /olustur?business=1) aynı PanelSidebar/SidebarNav bileşenini kullanır; bu
 * sabitler ikisinin de beslendiği ortak kaynaktır — sekmeler değiştiğinde tek
 * yerden güncellenir ve iki yüzey birbirinden bağımsız kopyalar tutup zamanla
 * birbirinden uzaklaşamaz.
 */
export const CORPORATE_PANEL_TAB_META: Record<CorporatePanelTab, { label: string; icon: IconName; group?: string; loadingLabel: string }> = {
  overview: { label: "Genel Bakış", icon: "building", group: "GENEL", loadingLabel: "Genel Bakış yükleniyor" },
  employees: { label: "Çalışanlar", icon: "users", group: "EKİP & KARTLAR", loadingLabel: "Çalışanlar yükleniyor" },
  cards: { label: "Kartlar", icon: "contact", loadingLabel: "Kartlar yükleniyor" },
  templates: { label: "Marka & Şablon", icon: "id", group: "MARKA & İÇERİK", loadingLabel: "Kurumsal şablonlar yükleniyor" },
  content: { label: "İçerik", icon: "link", loadingLabel: "İçerik yükleniyor" },
  analytics: { label: "İstatistikler", icon: "analytics", group: "YÖNETİM", loadingLabel: "İstatistikler yükleniyor" },
  licenses: { label: "Lisanslar", icon: "analytics", loadingLabel: "Lisanslar yükleniyor" },
  organization: { label: "Organizasyon", icon: "building", loadingLabel: "Organizasyon yükleniyor" },
  roles: { label: "Roller & Yetkiler", icon: "lock", loadingLabel: "Roller ve yetkiler yükleniyor" },
  settings: { label: "Ayarlar", icon: "pencil", loadingLabel: "Şirket ayarları yükleniyor" },
  leads: { label: "Leadler", icon: "users", group: "NETWORKING", loadingLabel: "Leadler yükleniyor" },
  events: { label: "Etkinlikler", icon: "analytics", loadingLabel: "Etkinlikler yükleniyor" },
  meetings: { label: "Görüşmeler", icon: "contact", loadingLabel: "Görüşmeler yükleniyor" },
};

/** Sidebar görünürlüğü ile sunucu yetkilendirmesinin aynı rol dilini kullanması için tek kaynak. */
export function corporateSidebarTabs(role?: string): readonly CorporatePanelTab[] {
  const normalizedRole = normalizeOrganizationRole(role);
  if (!normalizedRole) return CORPORATE_PANEL_TAB_ORDER;
  if (role === "DEPARTMENT_MANAGER") return ["employees"];
  if (role === "EMPLOYEE") return [];
  if (normalizedRole === "DEPARTMENT_MANAGER") return ["employees"];
  if (normalizedRole === "EMPLOYEE") return [];
  const canManageLicenses = normalizedRole === "OWNER" || normalizedRole === "ADMIN";
  return CORPORATE_PANEL_TAB_ORDER.filter((tab) => {
    if (tab === "licenses" || tab === "leads" || tab === "events" || tab === "meetings") return canManageLicenses;
    return true;
  });
}

export function corporateSidebarItems(role?: string) {
  const allowedTabs = new Set(corporateSidebarTabs(role));
  return filterSidebarByRole(CORPORATE_SIDEBAR_CONFIG, role)
    .filter((item) => allowedTabs.has(item.key as CorporatePanelTab))
    .map((item) => ({
      key: item.key as CorporatePanelTab,
      href: item.href,
      label: item.label,
      icon: item.icon,
      group: item.group,
    }));
}
