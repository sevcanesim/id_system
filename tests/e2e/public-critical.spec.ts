import { expect, test } from "@playwright/test";

const criticalRoutes = ["/", "/urunler", "/sepet", "/checkout", "/giris"];

for (const route of criticalRoutes) {
  test(`${route} hydrates without page errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBeLessThan(400);
    await page.waitForLoadState("load");
    await page.waitForTimeout(250);
    expect(errors).toEqual([]);
    expect(await page.locator("body").evaluate((el) => el.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test("mobile public navigation opens and closes", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only contract");
  await page.goto("/");

  const trigger = page.locator('button.yi-menu[aria-controls="site-primary-nav"]');
  const drawer = page.locator("#site-primary-nav");

  await expect(trigger).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(drawer).toBeHidden();
});

test("login form accepts input after hydration", async ({ page }) => {
  await page.goto("/giris");
  const email = page.locator('input[type="email"]').first();
  await expect(email).toBeVisible();
  await email.fill("qa@example.com");
  await expect(email).toHaveValue("qa@example.com");
});
