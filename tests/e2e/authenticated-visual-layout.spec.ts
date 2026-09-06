import { expect, test, type Page } from "@playwright/test";

const individualCredentials = {
  email: process.env.E2E_INDIVIDUAL_EMAIL ?? "",
  password: process.env.E2E_INDIVIDUAL_PASSWORD ?? "",
};

const corporateCredentials = {
  email: process.env.E2E_CORPORATE_EMAIL ?? "",
  password: process.env.E2E_CORPORATE_PASSWORD ?? "",
};

const individualRoutes = [
  "/kartim",
  "/olustur",
  "/hesabim",
  "/ayarlar",
  "/siparislerim",
  "/kartlarim",
  "/istatistikler",
  "/leadler",
];

const corporateRoutes = [
  "/kurumsal/panel",
  "/kurumsal/panel/organizasyon",
  "/kurumsal/panel/calisanlar",
  "/kurumsal/panel/roller",
  "/kurumsal/panel/sablon",
  "/kurumsal/panel/icerik",
  "/kurumsal/panel/etkinlikler",
  "/kurumsal/panel/leadler",
  "/kurumsal/panel/gorusmeler",
  "/kurumsal/panel/istatistikler",
  "/kurumsal/panel/lisans",
  "/kurumsal/panel/ayarlar",
];

async function login(page: Page, email: string, password: string) {
  await page.goto("/giris", { waitUntil: "domcontentloaded" });
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/giris(?:\?|$)/, { timeout: 20_000 });
}

async function auditRoute(page: Page, route: string, mobile: boolean) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${route} HTTP status`).toBeLessThan(400);
  await page.waitForLoadState("load");
  await page.waitForTimeout(250);
  expect(page.url(), `${route} should remain authenticated`).not.toContain("/giris");

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    undersizedText: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const text = element.textContent?.trim() ?? "";
        if (!text || rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || style.display === "none") return false;
        if (element.children.length > 0 && !Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())) return false;
        return Number.parseFloat(style.fontSize) < 11;
      })
      .slice(0, 8)
      .map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 80), fontSize: getComputedStyle(element).fontSize })),
  }));

  expect(layout.scrollWidth, `${route} horizontal overflow`).toBeLessThanOrEqual(layout.innerWidth + 1);
  expect(layout.undersizedText, `${route} text below 11px`).toEqual([]);

  if (mobile) {
    const undersizedControls = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("button, a, input, select, textarea"))
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0 || style.visibility === "hidden" || style.display === "none") return false;
        if (element instanceof HTMLInputElement && ["hidden", "checkbox", "radio"].includes(element.type)) return false;
        if (element.tagName === "A" && style.display === "inline") return false;
        return rect.height < 44;
      })
      .slice(0, 8)
      .map((element) => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 80), height: element.getBoundingClientRect().height })));
    expect(undersizedControls, `${route} controls below 44px`).toEqual([]);
  }
}

async function auditCorporateOwnCard(page: Page, mobile: boolean) {
  await page.goto("/kurumsal/panel", { waitUntil: "domcontentloaded" });

  const cardLink = page.getByRole("link", { name: "Kartım", exact: true });
  await expect(cardLink).toBeVisible({ timeout: 20_000 });
  const href = await cardLink.getAttribute("href");

  expect(href, "corporate own-card link").toMatch(
    /^\/kurumsal\/panel\/kartim\?business=1&organizationId=[^&]+(?:&id=[^&]+|&new=1)$/,
  );

  await auditRoute(page, href!, mobile);
  await expect(page.getByText("Panel görünümü hazırlanıyor")).toBeHidden({ timeout: 20_000 });
  await expect(page.getByText("Canlı Kart Önizlemesi", { exact: true })).toBeVisible({ timeout: 20_000 });
}

for (const viewport of [
  { name: "mobile", width: 390, height: 844, mobile: true },
  { name: "desktop", width: 1280, height: 900, mobile: false },
]) {
  test(`individual authenticated layout — ${viewport.name}`, async ({ page }) => {
    test.skip(!individualCredentials.email || !individualCredentials.password, "E2E individual credentials are not configured");
    test.setTimeout(120_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page, individualCredentials.email, individualCredentials.password);
    for (const route of individualRoutes) await auditRoute(page, route, viewport.mobile);
  });

  test(`corporate authenticated layout — ${viewport.name}`, async ({ page }) => {
    test.skip(!corporateCredentials.email || !corporateCredentials.password, "E2E corporate credentials are not configured");
    test.setTimeout(180_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await login(page, corporateCredentials.email, corporateCredentials.password);
    for (const route of corporateRoutes) await auditRoute(page, route, viewport.mobile);
    await auditCorporateOwnCard(page, viewport.mobile);
  });
}
