import { expect, test, type Page } from "@playwright/test";

type VisualAuditRoute = {
  path: string | null;
  label?: string;
  group: "public" | "commerce" | "individual" | "corporate";
  auth?: boolean;
};

const routes: VisualAuditRoute[] = [
  { path: "/", group: "public" },
  { path: "/urunler", group: "public" },
  { path: "/urunler/nfc-kart", group: "public" },
  { path: "/kurumsal", group: "public" },
  { path: "/nasil-calisir", group: "public" },
  { path: "/destek", group: "public" },
  { path: "/giris", group: "public" },
  { path: "/gizlilik", group: "public" },
  { path: "/kvkk", group: "public" },
  { path: "/iade-iptal", group: "public" },
  { path: "/mesafeli-satis-sozlesmesi", group: "public" },
  { path: "/hizmet-sartlari", group: "public" },
  { path: process.env.E2E_PUBLIC_SLUG ? `/${process.env.E2E_PUBLIC_SLUG}` : null, label: "/[slug]", group: "public" },
  { path: process.env.E2E_PUBLIC_ID ? `/p/${process.env.E2E_PUBLIC_ID}` : null, label: "/p/[publicId]", group: "public" },
  { path: process.env.E2E_CARD_CODE ? `/c/${process.env.E2E_CARD_CODE}` : null, label: "/c/[cardCode]", group: "public" },
  { path: process.env.E2E_EVENT_PUBLIC_ID ? `/e/${process.env.E2E_EVENT_PUBLIC_ID}` : null, label: "/e/[eventPublicId]", group: "public" },
  { path: process.env.E2E_ACTIVATION_TOKEN ? `/aktivasyon?token=${encodeURIComponent(process.env.E2E_ACTIVATION_TOKEN)}` : null, label: "/aktivasyon", group: "public" },
  { path: process.env.E2E_CORPORATE_INVITE_TOKEN ? `/kurumsal/davet?token=${encodeURIComponent(process.env.E2E_CORPORATE_INVITE_TOKEN)}` : null, label: "/kurumsal/davet", group: "public" },
  { path: "/sepet", group: "commerce" },
  { path: "/checkout", group: "commerce" },
  { path: "/odeme/basarili", group: "commerce" },
  { path: "/odeme/basarisiz", group: "commerce" },
  { path: "/nfc-siparis", group: "commerce" },
  { path: "/yenile", group: "commerce" },
  { path: "/kartim", group: "individual", auth: true },
  { path: "/olustur", group: "individual", auth: true },
  { path: "/hesabim", group: "individual", auth: true },
  { path: "/ayarlar", group: "individual", auth: true },
  { path: "/siparislerim", group: "individual", auth: true },
  { path: "/kartlarim", group: "individual", auth: true },
  { path: "/istatistikler", group: "individual", auth: true },
  { path: "/leadler", group: "individual", auth: true },
  { path: "/kurumsal/panel", group: "corporate", auth: true },
  { path: "/kurumsal/panel/organizasyon", group: "corporate", auth: true },
  { path: "/kurumsal/panel/calisanlar", group: "corporate", auth: true },
  { path: "/kurumsal/panel/roller", group: "corporate", auth: true },
  { path: "/kurumsal/panel/sablon", group: "corporate", auth: true },
  { path: "/kurumsal/panel/icerik", group: "corporate", auth: true },
  { path: "/kurumsal/panel/etkinlikler", group: "corporate", auth: true },
  { path: "/kurumsal/panel/leadler", group: "corporate", auth: true },
  { path: "/kurumsal/panel/gorusmeler", group: "corporate", auth: true },
  { path: "/kurumsal/panel/istatistikler", group: "corporate", auth: true },
  { path: "/kurumsal/panel/lisans", group: "corporate", auth: true },
  { path: "/kurumsal/panel/ayarlar", group: "corporate", auth: true },
];

const viewports = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "wide-1920", width: 1920, height: 1080 },
] as const;

async function visibleViolations(page: Page) {
  return page.locator("body").evaluate(() => {
    const isVisible = (element: Element) => {
      const html = element as HTMLElement;
      const style = getComputedStyle(html);
      const rect = html.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const userFacing = Array.from(document.querySelectorAll("body *")).filter(isVisible);
    const typography = userFacing.flatMap((element) => {
      const html = element as HTMLElement;
      if (html.children.length > 0 && !(html instanceof HTMLButtonElement) && !(html instanceof HTMLAnchorElement) && !(html instanceof HTMLLabelElement)) return [];
      const text = (html.innerText || html.textContent || "").trim();
      if (!text) return [];
      const style = getComputedStyle(html);
      const size = Number.parseFloat(style.fontSize);
      const family = style.fontFamily.toLowerCase();
      const lineHeight = style.lineHeight === "normal" ? size * 1.2 : Number.parseFloat(style.lineHeight);
      const issues: string[] = [];
      if (size < 11) issues.push(`font-size ${size}px`);
      if (family.includes("times") || family === "arial") issues.push(`font-family ${style.fontFamily}`);
      if (Number.isFinite(lineHeight) && lineHeight + 0.25 < size) issues.push(`line-height ${lineHeight}px < ${size}px`);
      return issues.length ? [`${html.tagName.toLowerCase()} ${JSON.stringify(text.slice(0, 80))}: ${issues.join(", ")}`] : [];
    });
    const viewport = { width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth };
    const escaping = userFacing.flatMap((element) => {
      const html = element as HTMLElement;
      const rect = html.getBoundingClientRect();
      if (rect.right > window.innerWidth + 1 || rect.left < -1) return [`${html.tagName.toLowerCase()}.${html.className}: left=${rect.left.toFixed(1)} right=${rect.right.toFixed(1)}`];
      return [];
    }).slice(0, 20);
    const longText = userFacing.flatMap((element) => {
      const html = element as HTMLElement;
      if (html.children.length > 0) return [];
      const text = (html.innerText || html.textContent || "").trim();
      if (text.length < 28 && !text.includes("@") && !text.includes("http")) return [];
      const rect = html.getBoundingClientRect();
      const parent = html.parentElement?.getBoundingClientRect();
      if (parent && rect.right > parent.right + 2 && getComputedStyle(html).whiteSpace !== "nowrap") return [`${html.tagName.toLowerCase()} ${JSON.stringify(text.slice(0, 80))}`];
      return [];
    }).slice(0, 20);
    return { typography, viewport, escaping, longText };
  });
}

async function mobileTouchTargetViolations(page: Page) {
  return page.locator("body").evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("button, a, input, select, textarea")).flatMap((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const visible = style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    if (!visible || style.display === "inline") return [];
    if (rect.height + 0.5 >= 44) return [];
    const label = (element.innerText || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim();
    return [`${element.tagName.toLowerCase()} ${JSON.stringify(label.slice(0, 60))}: ${rect.height.toFixed(1)}px`];
  }).slice(0, 30));
}

for (const route of routes) {
  for (const viewport of viewports) {
    const label = route.label ?? route.path ?? "dynamic-route";
    test(`${route.group} ${label} @ ${viewport.name}`, async ({ page }) => {
      test.skip(Boolean(route.auth), "Signed-in render authenticated visual suite tarafından doğrulanıyor.");
      test.skip(!route.path, "Dinamik route için güvenli fixture env değeri gerekli.");
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(route.path!, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${label} HTTP status`).toBeLessThan(400);
      await page.waitForLoadState("load");
      const violations = await visibleViolations(page);
      expect(violations.viewport.scrollWidth, `${label} document horizontal overflow`).toBeLessThanOrEqual(viewport.width + 1);
      expect(violations.escaping, `${label} viewport escape`).toEqual([]);
      expect(violations.typography, `${label} typography contract`).toEqual([]);
      expect(violations.longText, `${label} long-text containment`).toEqual([]);
      if (viewport.width <= 430) {
        expect(await mobileTouchTargetViolations(page), `${label} mobile touch targets`).toEqual([]);
      }
    });
  }
}
