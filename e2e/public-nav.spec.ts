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

  test("Escape closes the open drawer", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const toggle = page.locator("button.yi-menu");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#site-primary-nav")).not.toHaveClass(/is-open/);
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

  test("corporate login copy is in the first HTML, before hydration", async ({ request }) => {
    const individual = await request.get("/giris");
    expect(individual.ok()).toBeTruthy();
    const individualHtml = await individual.text();
    expect(individualHtml).toContain("<h2>Hesabına giriş yap</h2>");
    expect(individualHtml).toContain('action="/api/auth/login"');
    expect(individualHtml).toContain('data-login-portal="individual"');

    const business = await request.get("/giris?portal=business");
    expect(business.ok()).toBeTruthy();
    const html = await business.text();
    expect(html).toContain("<h2>Kurumsal hesabına giriş yap</h2>");
    expect(html).toContain('data-login-portal="business"');
    expect(html).toContain("Kurumsal / Ekip");
    expect(html).not.toContain("<h2>Hesabına giriş yap</h2>");
  });

  test("Kurumsal tab paints corporate copy", async ({ page }) => {
    await page.goto("/giris", { waitUntil: "load" });
    await page.getByRole("tab", { name: "Kurumsal / Ekip" }).click();
    await expect(page).toHaveURL(/portal=business/);
    await expect(page.getByRole("heading", { name: "Kurumsal hesabına giriş yap" })).toBeVisible();
  });

  test("empty checkout hydrates to a shop CTA, not a fake pending payment", async ({ page }) => {
    const response = await page.goto("/checkout", { waitUntil: "load" });
    const csp = response?.headers()["content-security-policy"] ?? "";
    const nonce = csp.match(/'nonce-([^']+)'/)?.[1] ?? "";
    const html = (await response?.text()) ?? "";
    expect(nonce).toBeTruthy();
    expect(html).toContain(`nonce="${nonce}"`);
    await expect(page.getByRole("heading", { name: "Kartın henüz sepette değil." })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("link", { name: "NFC Kartı Satın Al" }).first()).toBeVisible();
  });

  test("checkout masks sensitive content on blur and restores on focus", async ({ page }) => {
    await page.goto("/checkout", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "Ödeme bilgileri gizlendi." })).toBeHidden();

    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.getByRole("heading", { name: "Ödeme bilgileri gizlendi." })).toBeVisible();

    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(page.getByRole("heading", { name: "Ödeme bilgileri gizlendi." })).toBeHidden();
  });
});

test("corporate pricing keeps three decisions, equal desktop tier geometry, and granular capacity", async ({ page }) => {
  await page.goto("/kurumsal", { waitUntil: "load" });

  const tierGroup = page.getByLabel("Kurumsal paket seviyeleri");
  const tiers = tierGroup.getByRole("button");
  await expect(tiers).toHaveCount(3);

  const start = tierGroup.getByRole("button", { name: /Küçük ekipler[\s\S]*Start/ });
  const business = tierGroup.getByRole("button", { name: /Büyüyen şirketler[\s\S]*Business/ });
  const enterprise = tierGroup.getByRole("button", { name: /100\+ çalışan[\s\S]*Enterprise/ });

  await expect(start).toBeVisible();
  await expect(business).toBeVisible();
  await expect(enterprise).toBeVisible();
  await expect(business).toHaveAttribute("aria-pressed", "true");

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth > 720) {
    const tierHeights = await tiers.evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)));
    expect(new Set(tierHeights).size).toBe(1);
  }

  await expect(page.locator(".corporate-pack-picker__tick")).toHaveCount(7);
  await start.click();
  await expect(start).toHaveAttribute("aria-pressed", "true");
  await expect(business).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".corporate-pack-picker__head h3")).toBeVisible();

  await enterprise.click();
  const enterpriseLead = page.locator("#teklif");
  await expect(enterpriseLead).toBeVisible();
  await expect(enterpriseLead.getByRole("heading", { name: "Kurumsal yapınızı birlikte planlayalım." })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
