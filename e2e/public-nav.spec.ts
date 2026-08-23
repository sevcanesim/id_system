import { expect, test } from "@playwright/test";

/**
 * QA-2026-08-23-001: public hamburger must open the drawer at phone width.
 * Desktop Chromium defaults to 1280px, where `.yi-menu` is hidden; force 390.
 */
test.describe("public hamburger", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("opens the primary nav and reaches the catalog", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const toggle = page.getByRole("button", { name: "Menüyü aç" });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const nav = page.locator("#site-primary-nav");
    await expect(nav).toHaveClass(/is-open/);
    await expect(page.getByRole("button", { name: "Menüyü kapat" }).first()).toBeVisible();
    await nav.getByRole("link", { name: "Dijital Kartvizit" }).click();
    await expect(page).toHaveURL(/\/urunler(?:\/|$)/);
    await expect(nav).not.toHaveClass(/is-open/);
  });
});
