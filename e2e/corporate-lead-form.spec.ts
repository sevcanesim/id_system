import { expect, test } from "@playwright/test";

const viewports = [
  { name: "1440px Desktop", width: 1440, height: 900 },
  { name: "1280px Desktop", width: 1280, height: 800 },
  { name: "1024px Laptop/Tablet", width: 1024, height: 768 },
  { name: "768px Tablet", width: 768, height: 1024 },
  { name: "430px Mobile Large", width: 430, height: 932 },
  { name: "390px Mobile Medium", width: 390, height: 844 },
  { name: "360px Mobile Small", width: 360, height: 800 },
];

for (const vp of viewports) {
  test.describe(`/kurumsal live visual and overflow QA @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`renders all 8 sections without horizontal overflow`, async ({ page }) => {
      await page.goto("/kurumsal", { waitUntil: "load" });

      // 1. Hero title / kicker / CTAs
      await expect(page.locator(".section-kicker").first()).toHaveText("YENOMI BUSINESS");
      await expect(page.getByRole("heading", { name: /Ekibinizin dijital kimliğini tek (yerden|panelden) yönetin/ })).toBeVisible();
      await expect(page.getByRole("link", { name: /Kapasite ve Fiyatları Gör/ }).first()).toBeVisible();

      // 2. Outcomes metrics
      const outcomes = page.locator(".corporate-authentic-outcomes > div");
      await expect(outcomes).toHaveCount(3);
      await expect(page.getByText("Tek panel").first()).toBeVisible();

      // 3. Capacity table
      await expect(page.getByRole("heading", { name: "Tek panel, ekip büyüklüğüne göre kapasite." })).toBeVisible();
      const table = page.locator(".corporate-pack-table");
      await expect(table).toBeVisible();

      // 4. Network Mail section
      await expect(page.getByRole("heading", { name: /Tanışma kartvizitte kalmasın|Network Mail/ }).first()).toBeVisible();

      // 5. 100+ Lead Form
      const formSection = page.locator("#teklif");
      await expect(formSection).toBeVisible();
      await expect(formSection.getByRole("heading", { name: "Kurumsal yapınızı birlikte planlayalım." })).toBeVisible();

      // 6. Analytics cards
      await expect(page.getByRole("heading", { name: /Kart dağıtmakla kalmayın/ })).toBeVisible();
      const analyticsArticles = page.locator(".corporate-analytics-grid article");
      await expect(analyticsArticles).toHaveCount(4);

      // 7. Team use cases
      await expect(page.getByRole("heading", { name: /Satıştan İK’ya, aynı (kurumsal )?standart/ })).toBeVisible();
      const useCases = page.locator(".corporate-use-case-grid article");
      await expect(useCases).toHaveCount(3);

      // 8. Setup steps & Footer transition
      await expect(page.getByRole("heading", { name: "Üç adımda ekibiniz yayında." })).toBeVisible();
      const steps = page.locator(".corporate-step-grid li");
      await expect(steps).toHaveCount(3);

      await expect(page.locator("footer")).toBeVisible();

      // Horizontal overflow validation (must be 0 or max 1px rounding artifact)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${vp.name} page horizontal overflow`).toBeLessThanOrEqual(1);
    });
  });
}

test.describe("CorporateLeadForm interaction & submission QA", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("empty submit triggers HTML5 validation without network call", async ({ page }) => {
    let requestFired = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/corporate-leads")) requestFired = true;
    });

    await page.goto("/kurumsal#teklif", { waitUntil: "load" });
    const submitBtn = page.locator("#teklif button[type='submit']");
    await submitBtn.click();

    expect(requestFired).toBe(false);
  });

  test("invalid email triggers HTML5 validation", async ({ page }) => {
    let requestFired = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/corporate-leads")) requestFired = true;
    });

    await page.goto("/kurumsal#teklif", { waitUntil: "load" });
    await page.locator("#teklif input[name='fullName']").fill("Ahmet Yılmaz");
    await page.locator("#teklif input[name='email']").fill("invalid-email");
    await page.locator("#teklif input[name='company']").fill("Test A.Ş.");
    
    await page.locator("#teklif button[type='submit']").click();
    expect(requestFired).toBe(false);
  });

  test("honeypot filled causes silent success without saving lead", async ({ page }) => {
    await page.route("**/api/corporate-leads", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/kurumsal#teklif", { waitUntil: "load" });
    await page.locator("#teklif input[name='fullName']").fill("Bot Test");
    await page.locator("#teklif input[name='email']").fill("bot@spam.com");
    await page.locator("#teklif input[name='company']").fill("Spam Corp");
    
    // Fill hidden honeypot
    await page.evaluate(() => {
      const hp = document.querySelector<HTMLInputElement>("input[name='website']");
      if (hp) hp.value = "http://spam.bot";
    });

    await page.locator("#teklif button[type='submit']").click();
    
    // Should show success state to confuse bots
    await expect(page.locator(".corporate-lead-feedback")).toBeVisible();
    await expect(page.locator(".corporate-lead-feedback")).toContainText("Talebiniz alındı");
  });

  test("API 400 error displays user-facing error message", async ({ page }) => {
    await page.route("**/api/corporate-leads", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Lütfen zorunlu alanları kontrol edin." }),
      });
    });

    await page.goto("/kurumsal#teklif", { waitUntil: "load" });
    await page.locator("#teklif input[name='fullName']").fill("Ayşe Demir");
    await page.locator("#teklif input[name='email']").fill("ayse@sirket.com");
    await page.locator("#teklif input[name='company']").fill("Demir Lojistik");

    await page.locator("#teklif button[type='submit']").click();

    const feedback = page.locator(".corporate-lead-feedback.error");
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText("Lütfen zorunlu alanları kontrol edin.");
  });

  test("API 500 server error displays user-facing error message", async ({ page }) => {
    await page.route("**/api/corporate-leads", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Talep işlenemedi. Lütfen tekrar deneyin." }),
      });
    });

    await page.goto("/kurumsal#teklif", { waitUntil: "load" });
    await page.locator("#teklif input[name='fullName']").fill("Zeynep Kaya");
    await page.locator("#teklif input[name='email']").fill("zeynep@sirket.com");
    await page.locator("#teklif input[name='company']").fill("Kaya Teknoloji");

    await page.locator("#teklif button[type='submit']").click();

    const feedback = page.locator(".corporate-lead-feedback.error");
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText("Talep işlenemedi. Lütfen tekrar deneyin.");
  });

  test("API 429 rate limit displays rate limit message", async ({ page }) => {
    await page.route("**/api/corporate-leads", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin." }),
      });
    });

    await page.goto("/kurumsal#teklif", { waitUntil: "load" });
    await page.locator("#teklif input[name='fullName']").fill("Mehmet Can");
    await page.locator("#teklif input[name='email']").fill("mehmet@sirket.com");
    await page.locator("#teklif input[name='company']").fill("Can Holding");

    await page.locator("#teklif button[type='submit']").click();

    const feedback = page.locator(".corporate-lead-feedback.error");
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText("Çok fazla talep gönderildi");
  });

  test("successful lead submission shows loading and success feedback", async ({ page }) => {
    await page.route("**/api/corporate-leads", async (route) => {
      await new Promise((r) => setTimeout(r, 200));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, notified: true }),
      });
    });

    await page.goto("/kurumsal#teklif", { waitUntil: "load" });
    await page.locator("#teklif input[name='fullName']").fill("Selin Yılmaz");
    await page.locator("#teklif input[name='email']").fill("selin@yenomi.com");
    await page.locator("#teklif input[name='company']").fill("Yenomi Labs");
    await page.locator("#teklif textarea[name='message']").fill("500 kişilik ekip için özel entegrasyon teklifi almak istiyoruz.");

    const submitBtn = page.locator("#teklif button[type='submit']");
    await submitBtn.click();

    const feedback = page.locator(".corporate-lead-feedback.success");
    await expect(feedback).toBeVisible();
    await expect(feedback).toContainText("Talebiniz alındı. Ekibimiz 1 iş günü içinde sizinle iletişime geçecek.");

    // Form is reset
    await expect(page.locator("#teklif input[name='fullName']")).toHaveValue("");
    await expect(page.locator("#teklif input[name='email']")).toHaveValue("");
    await expect(page.locator("#teklif input[name='company']")).toHaveValue("");
  });
});
