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
  "audit",
  "integrations",
  "analytics",
  "leads",
  "events",
  "meetings",
  "commerce",
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
  "/kurumsal/panel/denetim": "audit",
  "/kurumsal/panel/entegrasyonlar": "integrations",
  "/kurumsal/panel/istatistikler": "analytics",
  "/kurumsal/panel/leadler": "leads",
  "/kurumsal/panel/etkinlikler": "events",
  "/kurumsal/panel/gorusmeler": "meetings",
  "/kurumsal/panel/satin-almalar": "commerce",
  "/kurumsal/panel/organizasyon": "organization",
  "/kurumsal/panel/ayarlar": "settings",
};

export function isCorporatePanelTab(value: string | null): value is CorporatePanelTab {
  return Boolean(value && (CORPORATE_PANEL_TABS as readonly string[]).includes(value));
}

// Sekme anahtarından rotaya — cards eski link uyumluluğu için korunur;
// ürün navigasyonunda canonical hedef employees/Ekip & Kartlar'dır.
export const CORPORATE_PANEL_TAB_ROUTE: Record<CorporatePanelTab, string> = Object.fromEntries(
  Object.entries(CORPORATE_PANEL_ROUTE_TO_TAB).map(([route, tab]) => [tab, route]),
) as Record<CorporatePanelTab, string>;

export const CORPORATE_PANEL_TAB_ORDER: readonly CorporatePanelTab[] = [
  "overview",
  "employees",
  "templates",
  "content",
  "audit",
  "integrations",
  "analytics",
  "organization",
  "roles",
  "leads",
  "events",
  "meetings",
  "commerce",
];

export const CORPORATE_PANEL_TAB_META: Record<CorporatePanelTab, { label: string; icon: IconName; group?: string; loadingLabel: string }> = {
  overview: { label: "Genel Bakış", icon: "building", group: "GENEL", loadingLabel: "Genel Bakış yükleniyor" },
  employees: { label: "Ekip & Kartlar", icon: "users", group: "EKİP & KARTLAR", loadingLabel: "Ekip ve kartlar yükleniyor" },
  cards: { label: "Kart Envanteri", icon: "id", group: "EKİP & KARTLAR", loadingLabel: "Kart envanteri yükleniyor" },
  templates: { label: "Marka & Şablon", icon: "id", group: "MARKA & İÇERİK", loadingLabel: "Kurumsal şablonlar yükleniyor" },
  content: { label: "İçerik", icon: "link", group: "MARKA & İÇERİK", loadingLabel: "İçerik yükleniyor" },
  audit: { label: "Güvenlik & Denetim", icon: "shield", group: "MARKA & İÇERİK", loadingLabel: "Denetim kayıtları yükleniyor" },
  integrations: { label: "Entegrasyonlar", icon: "link", group: "MARKA & İÇERİK", loadingLabel: "Entegrasyonlar yükleniyor" },
  analytics: { label: "İstatistikler", icon: "analytics", group: "YÖNETİM", loadingLabel: "İstatistikler yükleniyor" },
  organization: { label: "Organizasyon", icon: "building", group: "YÖNETİM", loadingLabel: "Organizasyon yükleniyor" },
  roles: { label: "Roller & Yetkiler", icon: "lock", group: "YÖNETİM", loadingLabel: "Roller ve yetkiler yükleniyor" },
  settings: { label: "Ayarlar", icon: "adjustments", group: "YÖNETİM", loadingLabel: "Şirket ayarları yükleniyor" },
  leads: { label: "Leadler", icon: "mail", group: "NETWORKING", loadingLabel: "Leadler yükleniyor" },
  events: { label: "Etkinlikler", icon: "clock", group: "NETWORKING", loadingLabel: "Etkinlikler yükleniyor" },
  meetings: { label: "Görüşmeler", icon: "headset", group: "NETWORKING", loadingLabel: "Görüşmeler yükleniyor" },
  commerce: { label: "Abonelik & Satın Almalar", icon: "box", group: "TİCARİ", loadingLabel: "Satın alma geçmişi yükleniyor" },
};

/** Sidebar görünürlüğü ile sunucu yetkilendirmesinin aynı rol dilini kullanması için tek kaynak. */
export function corporateSidebarTabs(role?: string): readonly CorporatePanelTab[] {
  const normalizedRole = normalizeOrganizationRole(role);
  if (!normalizedRole) return CORPORATE_PANEL_TAB_ORDER;
  if (normalizedRole === "EMPLOYEE") return [];
  const canManageLicenses = normalizedRole === "OWNER" || normalizedRole === "ADMIN";
  const allowedTabs: readonly CorporatePanelTab[] = canManageLicenses
    ? [...CORPORATE_PANEL_TAB_ORDER, "cards"]
    : CORPORATE_PANEL_TAB_ORDER;
  return allowedTabs.filter((tab) => {
    if (tab === "leads" || tab === "events" || tab === "meetings") return canManageLicenses;
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

/** Personal destination shared by the management shell and Kartım editor. */
export const CORPORATE_OWN_CARD_NAV_ITEM = {
  key: "kartim",
  href: "/kurumsal/panel/kartim",
  label: "Kartım",
  icon: "contact" as IconName,
  group: "KİŞİSEL",
};

export type CorporateNavItem = {
  key: string;
  href: string;
  label: string;
  icon: IconName;
  group?: string;
};

/** Management tabs plus Kartım — single nav source for both corporate sidebars. */
export function corporatePanelNavItems(role?: string, ownCardHref?: string): CorporateNavItem[] {
  return [
    ...corporateSidebarItems(role),
    {
      ...CORPORATE_OWN_CARD_NAV_ITEM,
      href: ownCardHref || CORPORATE_OWN_CARD_NAV_ITEM.href,
    },
  ];
}

/** Deterministically resolves active navigation key from usePathname(). */
export function getCorporateSidebarActiveKey(pathname: string): CorporatePanelTab | "kartim" {
  if (pathname === "/kurumsal/panel/kartim" || pathname.startsWith("/kurumsal/panel/kartim/")) {
    return "kartim";
  }
  if (pathname === "/kurumsal/panel/kartlar" || pathname.startsWith("/kurumsal/panel/kartlar/")) {
    return "employees";
  }
  const routeTab = CORPORATE_PANEL_ROUTE_TO_TAB[pathname];
  if (routeTab) return routeTab;
  for (const [route, tab] of Object.entries(CORPORATE_PANEL_ROUTE_TO_TAB)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) return tab;
  }
  return "overview";
}
