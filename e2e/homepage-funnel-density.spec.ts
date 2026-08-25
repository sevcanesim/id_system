import { expect, test } from "@playwright/test";

test("homepage how-it-works stays concise and non-repetitive", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });

  const howItWorks = page.locator("#nasil-calisir");
  await expect(howItWorks).toBeVisible();
  await expect(howItWorks.locator(".home-premium__journey-steps li")).toHaveCount(3);
  await expect(howItWorks.locator(".home-sales-editorial")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Aynı sistem/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Seç\. Oluştur\./ })).toBeVisible();
});

test("homepage remains bounded at mobile, tablet, and desktop widths", async ({ page }) => {
  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ] as const;

  await page.setViewportSize(viewports[0]);
  await page.goto("/", { waitUntil: "load" });

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve(null))));

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${viewport.width}px viewport overflow`).toBeLessThanOrEqual(1);

    const stage = page.locator(".home-sales-stage");
    await expect(stage).toBeVisible();
    const stageBox = await stage.boundingBox();
    expect(stageBox?.width ?? 0).toBeLessThanOrEqual(viewport.width);

    if (viewport.width === 390) {
      expect(stageBox?.height ?? Infinity).toBeLessThanOrEqual(500);
      await expect(page.getByRole("link", { name: /NFC Kartı Satın Al/ }).first()).toBeVisible();
    }
  }
});
