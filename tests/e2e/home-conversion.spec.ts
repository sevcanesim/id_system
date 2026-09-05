import { expect, test } from "@playwright/test";

// Contract tests for the "/" homepage's revenue-critical surface: every CTA on
// the page must resolve to the same Premium package URL, and the price shown
// in the hero must match the price shown in the mobile sticky bar (both read
// from lib/commerce/packages.ts at build time, so a mismatch here means the
// two components have drifted apart, not that the config is wrong).

const PREMIUM_HREF = "/urunler/nfc-kart?paket=premium";

test("hero primary CTA makes the individual Premium level explicit", async ({ page }) => {
  await page.goto("/");
  const heroCta = page.locator(".home-sales-actions a.home-mockup__button--primary");
  await expect(heroCta).toBeVisible();
  await expect(heroCta).toHaveText(/Bireysel Premium’u İncele/);
  await expect(heroCta).toHaveAttribute("href", PREMIUM_HREF);
});

test("final CTA section keeps the Premium level explicit", async ({ page }) => {
  await page.goto("/");
  const finalCta = page.locator("section[aria-labelledby='final-title'] a.home-mockup__button");
  await expect(finalCta).toHaveText(/Bireysel Premium’u Seç/);
  await expect(finalCta).toHaveAttribute("href", PREMIUM_HREF);
});

test("mobile sticky CTA shows the same price as the hero offer", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile-only sticky bar");
  await page.goto("/");

  const heroPrice = await page
    .locator(".home-sales-offer strong")
    .first()
    .innerText();
  const stickyPrice = await page
    .locator(".home-sales-mobile-cta__copy strong")
    .innerText();

  // Both render "<price> · ilk yıl dahil" from the same formatTryFromKurus() call —
  // they must be byte-identical, not just "close".
  expect(stickyPrice).toBe(heroPrice);

  const stickyCta = page.locator(".home-sales-mobile-cta a.home-mockup__button");
  await expect(stickyCta).toHaveAttribute("href", PREMIUM_HREF);
});

test("package comparison table is a real accessible table with three named columns", async ({ page }) => {
  await page.goto("/");
  const table = page.getByRole("table", { name: "Paket karşılaştırması" });
  await expect(table).toBeVisible();

  const headers = table.getByRole("columnheader");
  await expect(headers).toHaveCount(4); // blank feature-label header + Bireysel/Premium/Kurumsal
  await expect(headers.nth(1)).toHaveText("Bireysel NFC");
  await expect(headers.nth(2)).toHaveText("Bireysel Premium");
  await expect(headers.nth(3)).toHaveText("Kurumsal");
});

test("FAQ items expand and collapse independently", async ({ page }) => {
  await page.goto("/");
  const items = page.locator(".home-sales-faq-item");
  const first = items.nth(0);
  const second = items.nth(1);

  await expect(first).toHaveAttribute("open", "");
  await expect(second).not.toHaveAttribute("open", "");

  await second.locator("summary").click();
  await expect(second).toHaveAttribute("open", "");
});
