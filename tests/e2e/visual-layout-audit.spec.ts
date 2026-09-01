import { expect, test, type Page } from "@playwright/test";

type AuditRoute = {
  path: string;
  family: "public" | "commerce" | "individual" | "corporate";
  auth?: "individual" | "corporate";
  dynamicEnv?: string;
};

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "desktop-1920", width: 1920, height: 1080 },
] as const;

const ROUTES: AuditRoute[] = [
  { path: "/", family: "public" },
  { path: "/urunler", family: "public" },
  { path: "/urunler/nfc-kart", family: "public" },
  { path: "/kurumsal", family: "public" },
  { path: "/nasil-calisir", family: "public" },
  { path: "/destek", family: "public" },
  { path: "/giris", family: "public" },
  { path: "/gizlilik", family: "public" },
  { path: "/kvkk", family: "public" },
  { path: "/iade-iptal", family: "public" },
  { path: "/mesafeli-satis-sozlesmesi", family: "public" },
  { path: "/hizmet-sartlari", family: "public" },
  { path: "/__DYNAMIC_SLUG__", family: "public", dynamicEnv: "E2E_PUBLIC_SLUG" },
  { path: "/p/__PUBLIC_ID__", family: "public", dynamicEnv: "E2E_PUBLIC_ID" },
  { path: "/c/__CARD_CODE__", family: "public", dynamicEnv: "E2E_CARD_CODE" },
  { path: "/e/__EVENT_ID__", family: "public", dynamicEnv: "E2E_EVENT_PUBLIC_ID" },
  { path: "/sepet", family: "commerce" },
  { path: "/checkout", family: "commerce" },
  { path: "/odeme/basarili", family: "commerce" },
  { path: "/odeme/basarisiz", family: "commerce" },
  { path: "/nfc-siparis", family: "commerce" },
  { path: "/yenile", family: "commerce", auth: "individual" },
  { path: "/kartim", family: "individual", auth: "individual" },
  { path: "/olustur", family: "individual", auth: "individual" },
  { path: "/hesabim", family: "individual", auth: "individual" },
  { path: "/ayarlar", family: "individual", auth: "individual" },
  { path: "/siparislerim", family: "individual", auth: "individual" },
  { path: "/kartlarim", family: "individual", auth: "individual" },
  { path: "/istatistikler", family: "individual", auth: "individual" },
  { path: "/leadler", family: "individual", auth: "individual" },
  { path: "/kurumsal/panel", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/organizasyon", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/calisanlar", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/roller", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/sablon", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/icerik", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/etkinlikler", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/leadler", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/gorusmeler", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/istatistikler", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/lisans", family: "corporate", auth: "corporate" },
  { path: "/kurumsal/panel/ayarlar", family: "corporate", auth: "corporate" },
];

function resolveRoute(route: AuditRoute) {
  if (!route.dynamicEnv) return route.path;
  const value = process.env[route.dynamicEnv];
  if (!value) return null;
  if (route.path === "/__DYNAMIC_SLUG__") return `/${encodeURIComponent(value)}`;
  if (route.path.includes("__PUBLIC_ID__")) return route.path.replace("__PUBLIC_ID__", encodeURIComponent(value));
  if (route.path.includes("__CARD_CODE__")) return route.path.replace("__CARD_CODE__", encodeURIComponent(value));
  return route.path.replace("__EVENT_ID__", encodeURIComponent(value));
}

async function assertNoDocumentOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(metrics.scrollWidth, `${label}: document yatay taşıyor (${metrics.scrollWidth}px > ${metrics.clientWidth}px)`).toBeLessThanOrEqual(metrics.clientWidth + 1);
}

async function assertNoViewportEscape(page: Page, label: string) {
  const offenders = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    return Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((el) => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") return false;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const scrollableX = ["auto", "scroll"].includes(style.overflowX);
        if (scrollableX) return false;
        return rect.left < -1 || rect.right > viewport + 1;
      })
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === "string" ? el.className.slice(0, 120) : "",
        text: (el.textContent || "").trim().slice(0, 80),
        rect: el.getBoundingClientRect().toJSON(),
      }));
  });
  expect(offenders, `${label}: viewport dışına taşan component bulundu: ${JSON.stringify(offenders)}`).toEqual([]);
}

async function assertTypography(page: Page, label: string) {
  const issues = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,label,button,input,select,textarea,th,td,small"));
    return candidates
      .filter((el) => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const family = style.fontFamily.toLowerCase();
        const forbiddenFamily = family.includes("times new roman") || /^times(?:,|$)/.test(family) || /^arial(?:,|$)/.test(family);
        const lineHeight = Number.parseFloat(style.lineHeight);
        const fontSize = Number.parseFloat(style.fontSize);
        const compressed = Number.isFinite(lineHeight) && Number.isFinite(fontSize) && lineHeight + 0.5 < fontSize;
        return forbiddenFamily || compressed;
      })
      .slice(0, 8)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: typeof el.className === "string" ? el.className.slice(0, 100) : "",
        text: (el.textContent || "").trim().slice(0, 80),
        fontFamily: getComputedStyle(el).fontFamily,
        fontSize: getComputedStyle(el).fontSize,
        lineHeight: getComputedStyle(el).lineHeight,
      }));
  });
  expect(issues, `${label}: font/line-height sözleşmesi ihlali: ${JSON.stringify(issues)}`).toEqual([]);
}

async function assertLongTextContainment(page: Page, label: string) {
  const issues = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("a,td,th,strong,span,p,label"));
    return candidates
      .filter((el) => {
        const text = (el.textContent || "").trim();
        if (text.length < 28 && !text.includes("@") && !text.includes("http")) return false;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (["auto", "scroll"].includes(style.overflowX)) return false;
        return el.scrollWidth > el.clientWidth + 2 && style.textOverflow !== "ellipsis" && style.overflowWrap !== "anywhere" && style.wordBreak !== "break-all";
      })
      .slice(0, 8)
      .map((el) => ({ tag: el.tagName.toLowerCase(), cls: typeof el.className === "string" ? el.className.slice(0, 100) : "", text: (el.textContent || "").trim().slice(0, 100) }));
  });
  expect(issues, `${label}: uzun metin containment problemi: ${JSON.stringify(issues)}`).toEqual([]);
}

for (const route of ROUTES) {
  test.describe(`${route.family} ${route.path}`, () => {
    for (const viewport of VIEWPORTS) {
      test(`${viewport.name} layout contract`, async ({ page }) => {
        const resolved = resolveRoute(route);
        test.skip(!resolved, `${route.dynamicEnv} tanımlı olmadığı için dinamik fixture bekleniyor.`);
        test.skip(Boolean(route.auth), "Signed-in render için izole authenticated fixture/storageState gerekli; auth boundary ayrı suite tarafından doğrulanıyor.");

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(resolved!, { waitUntil: "domcontentloaded" });
        expect(response?.status() ?? 200, `${resolved} HTTP 5xx döndürdü`).toBeLessThan(500);
        await page.waitForTimeout(150);

        const label = `${resolved} @ ${viewport.name}`;
        await assertNoDocumentOverflow(page, label);
        await assertNoViewportEscape(page, label);
        await assertTypography(page, label);
        await assertLongTextContainment(page, label);
      });
    }
  });
}
