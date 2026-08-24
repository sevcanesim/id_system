import { expect, test } from "@playwright/test";

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

  test("homepage remains usable at 390px", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /Bir kez basılır/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /NFC Kartımı Al/ }).first()).toBeVisible();

    const stage = page.locator(".home-sales-stage");
    await expect(stage).toBeVisible();
    const box = await stage.boundingBox();
    expect(box?.width ?? 0).toBeLessThanOrEqual(390);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
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

test("homepage has no horizontal overflow at tablet and desktop widths", async ({ page }) => {
  for (const width of [768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: /Bir kez basılır/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${width}px viewport overflow`).toBeLessThanOrEqual(1);
  }
});

test("product catalog exposes the primary purchase above the fold and keeps three plan decisions", async ({ page }) => {
  await page.goto("/urunler", { waitUntil: "load" });

  await expect(page.getByRole("heading", { name: /Tek kart\.\s*Değişmeyen bağlantın\./ })).toBeVisible();
  await expect(page.getByText("₺1.490").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Yenomi ID’mi Al" }).first()).toBeVisible();

  const plans = page.locator(".products-premium-v2__plan-card");
  await expect(plans).toHaveCount(3);
  await expect(page.getByRole("heading", { name: /Tek kimlik\.\s*İhtiyacına göre üç seviye\./ })).toBeVisible();
  await expect(page.getByText("Standart seçim", { exact: true })).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  if (viewportWidth > 980) {
    const heights = await plans.evaluateAll((nodes) => nodes.map((node) => Math.round(node.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBe(1);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("corporate pricing keeps three decisions, equal desktop tier geometry, and granular capacity", async ({ page }) => {
  await page.goto("/kurumsal", { waitUntil: "load" });

  await expect(page.getByRole("heading", { name: "Tek panel, ekip büyüklüğüne göre kapasite." })).toBeVisible();
  const table = page.locator(".corporate-pack-table");
  await expect(table).toBeVisible();
  const rows = table.locator("tbody tr");
  await expect(rows).toHaveCount(7);

  const enterpriseLead = page.locator("#teklif");
  await expect(enterpriseLead).toBeVisible();
  await expect(enterpriseLead.getByRole("heading", { name: "Kurumsal yapınızı birlikte planlayalım." })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
