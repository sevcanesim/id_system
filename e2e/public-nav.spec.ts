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
    const cspViolations: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (text.includes("Content Security Policy") && text.includes("script-src")) cspViolations.push(text);
    });

    const response = await page.goto("/", { waitUntil: "load" });
    const csp = response?.headers()["content-security-policy"] ?? "";
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1] ?? "";
    const html = (await response?.text()) ?? "";
    expect(nonce).toBeTruthy();
    expect(html).toContain(`nonce="${nonce}"`);

    const toggle = page.locator("button.yi-menu");
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(cspViolations, cspViolations.join("\n")).toEqual([]);
    const nav = page.locator("#site-primary-nav");
    await expect(nav).toHaveClass(/is-open/);
    await expect(page.getByRole("button", { name: "Menüyü kapat" }).first()).toBeVisible();
    await nav.getByRole("link", { name: "Dijital Kartvizit" }).click();
    await expect(page).toHaveURL(/\/urunler(?:\/|$)/);
    await expect(nav).not.toHaveClass(/is-open/);
  });

  test("login, cart, and checkout documents stamp the CSP nonce", async ({ request }) => {
    for (const path of ["/giris", "/sepet", "/checkout"]) {
      const response = await request.get(path);
      expect(response.ok(), path).toBeTruthy();
      const csp = response.headers()["content-security-policy"] ?? "";
      const nonce = csp.match(/'nonce-([^']+)'/)?.[1] ?? "";
      const html = await response.text();
      expect(nonce, path).toBeTruthy();
      expect(html, `${path} must carry the response CSP nonce`).toContain(`nonce="${nonce}"`);
    }
  });

  test("empty checkout hydrates to a shop CTA, not a fake pending payment", async ({ page }) => {
    const response = await page.goto("/checkout", { waitUntil: "load" });
    const csp = response?.headers()["content-security-policy"] ?? "";
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1] ?? "";
    const html = (await response?.text()) ?? "";
    expect(nonce).toBeTruthy();
    expect(html).toContain(`nonce="${nonce}"`);
    await expect(page.getByRole("heading", { name: "Kartın henüz sepette değil." })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("link", { name: "NFC Kartı Satın Al" }).first()).toBeVisible();
  });
});
