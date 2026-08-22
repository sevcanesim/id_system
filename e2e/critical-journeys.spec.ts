import { expect, test } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "";
const sandboxReady = Boolean(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY);

/**
 * Critical journeys E2E-01…07 from the hardening audit.
 *
 * COVERAGE: 1/7 automated (E2E-06). 6/7 are skeleton skips.
 * A skipped test is not a pass. `npm run verify:release` prints this banner
 * so CI cannot treat the file name as payment-chain coverage.
 *
 * Payment → entitlement → activation → claim is not an E2E yet.
 * Duplicate-callback and auto-claim behavior is covered at unit level in
 * lib/payments/settle-commerce-payment.test.ts until sandbox secrets exist.
 */
test.describe("critical journeys", () => {
  test.skip(!baseURL, "E2E_BASE_URL is unset; journeys are not run.");

  test("E2E-01 guest physical purchase through iyzico sandbox", async () => {
    test.skip(true, sandboxReady
      ? "Guest checkout sandbox journey is not automated in this pass."
      : "iyzico sandbox credentials are unset; payment journeys are not run.");
  });

  test("E2E-02 delayed callback recover", async () => {
    test.skip(true, sandboxReady
      ? "Recover-after-closed-tab journey is not automated in this pass."
      : "iyzico sandbox credentials are unset; payment journeys are not run.");
  });

  test("E2E-03 duplicate callback is idempotent", async () => {
    test.skip(true, sandboxReady
      ? "Callback replay journey is not automated in this pass."
      : "iyzico sandbox credentials are unset; payment journeys are not run.");
  });

  test("E2E-04 guest claim binds the matching email", async () => {
    test.skip(true, sandboxReady
      ? "Guest activation claim journey is not automated in this pass."
      : "iyzico sandbox credentials are unset; payment journeys are not run.");
  });

  test("E2E-05 authenticated purchase auto-claims", async () => {
    test.skip(true, sandboxReady
      ? "Authenticated auto-claim journey is not automated in this pass."
      : "iyzico sandbox credentials are unset; payment journeys are not run.");
  });

  test("E2E-06 spare card stays gated for guests", async ({ page }) => {
    await page.goto("/urunler", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("YEDEK KART")).toBeVisible();
    await expect(page.getByText(/Giriş gerekli/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Sepete Ekle" }).last()).toBeDisabled();
  });

  test("E2E-07 spare card with an active entitlement", async () => {
    test.skip(true, "Signed-in entitlement fixture is not available in this environment.");
  });
});
