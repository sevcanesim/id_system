import { expect, test, type Page, type TestInfo } from "@playwright/test";

const fullViewportMatrix = [
  { width: 320, height: 568, label: "320x568" },
  { width: 360, height: 800, label: "360x800" },
  { width: 375, height: 812, label: "375x812" },
  { width: 390, height: 844, label: "390x844" },
  { width: 430, height: 932, label: "430x932" },
  { width: 768, height: 1024, label: "768x1024" },
  { width: 820, height: 1180, label: "820x1180" },
  { width: 1024, height: 1366, label: "1024x1366" },
  { width: 1280, height: 800, label: "1280x800" },
  { width: 1440, height: 900, label: "1440x900" },
  { width: 1512, height: 982, label: "1512x982" },
  { width: 1728, height: 1117, label: "1728x1117" },
] as const;

const criticalViewportMatrix = [
  { width: 390, height: 844, label: "390x844" },
  { width: 768, height: 1024, label: "768x1024" },
  { width: 1440, height: 900, label: "1440x900" },
] as const;

const publicAndCommerceRoutes = [
  "/",
  "/urunler",
  "/urunler/nfc-kart",
  "/nasil-calisir",
  "/kurumsal",
  "/giris",
  "/sepet",
  "/checkout",
  "/odeme/basarili",
  "/odeme/basarisiz",
] as const;

const protectedRoutes = [
  "/hesabim",
  "/kartlarim",
  "/kartim",
  "/olustur",
  "/ayarlar",
  "/istatistikler",
  "/siparislerim",
  "/leadler",
  "/aktivasyon",
  "/kurumsal/panel",
  "/kurumsal/panel/calisanlar",
  "/kurumsal/panel/kartlar",
  "/kurumsal/panel/sablonlar",
  "/kurumsal/panel/icerik",
  "/kurumsal/panel/istatistikler",
  "/kurumsal/panel/organizasyon",
  "/kurumsal/panel/roller",
] as const;

async function documentOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const delta = root.scrollWidth - window.innerWidth;
    const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          className: typeof element.className === "string" ? element.className : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.right > window.innerWidth + 1 || item.left < -1)
      .slice(0, 20);
    return { delta, offenders };
  });
}

async function assertResponsiveInvariants(page: Page, route: string, testInfo: TestInfo) {
  const pageErrors: string[] = [];
  const onPageError = (error: Error) => pageErrors.push(error.message);
  page.on("pageerror", onPageError);

  try {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `${route} should not return an HTTP error`).toBeLessThan(500);
    await page.waitForLoadState("networkidle").catch(() => undefined);

    const overflow = await documentOverflow(page);
    if (overflow.delta > 1) {
      await testInfo.attach("overflow-diagnostics", {
        body: Buffer.from(JSON.stringify({ route, viewport: page.viewportSize(), ...overflow }, null, 2)),
        contentType: "application/json",
      });
    }

    expect(pageErrors, `${route} should not raise uncaught page errors`).toEqual([]);
    expect(overflow.delta, `${route} document overflow: ${JSON.stringify(overflow.offenders)}`).toBeLessThanOrEqual(1);

    const main = page.locator("main").first();
    if (await main.count()) await expect(main).toBeVisible();
  } finally {
    page.off("pageerror", onPageError);
  }
}

for (const route of publicAndCommerceRoutes) {
  test(`${route} passes the complete responsive matrix`, async ({ page }, testInfo) => {
    for (const viewport of fullViewportMatrix) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await test.step(viewport.label, async () => {
        await assertResponsiveInvariants(page, route, testInfo);
      });
    }
  });
}

for (const route of protectedRoutes) {
  test(`${route} has a stable unauthenticated responsive boundary`, async ({ page }, testInfo) => {
    for (const viewport of criticalViewportMatrix) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await test.step(viewport.label, async () => {
        await assertResponsiveInvariants(page, route, testInfo);
      });
    }
  });
}

test("mobile navigation preserves focus and escape behavior", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.locator('button.yi-menu[aria-controls="site-primary-nav"]');
  const drawer = page.locator("#site-primary-nav");
  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.focus();
  await trigger.click();
  await expect(drawer).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
});

test("critical mobile header controls meet Yenomi touch-target invariant", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const controls = page.locator(".public-site-chrome button:visible, .public-site-chrome a:visible");
  const count = await controls.count();
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    const box = await control.boundingBox();
    if (!box) continue;
    const ariaHidden = await control.getAttribute("aria-hidden");
    if (ariaHidden === "true") continue;
    expect(box.height, `header control ${index} is shorter than 44px`).toBeGreaterThanOrEqual(44);
  }
});
