import { expect, test } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "";
const sandboxReady = Boolean(process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY);

/**
 * [E2E-01] AUTOMATION: NONE
 * [E2E-02] AUTOMATION: PARTIAL
 * [E2E-03] AUTOMATION: PARTIAL
 * [E2E-04] AUTOMATION: NONE
 * [E2E-05] AUTOMATION: PARTIAL
 * [E2E-06] AUTOMATION: FULL
 * [E2E-07] AUTOMATION: NONE
 *
 * PARTIAL means the core domain behavior has deterministic automated coverage,
 * but the named browser/provider journey is not yet executed end-to-end in CI.
 * A skipped Playwright test is never counted as FULL.
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
      ? "Browser recovery journey is not automated; settlement pending/recovery behavior is covered deterministically at unit level."
      : "iyzico sandbox credentials are unset; browser recovery journey is not run.");
  });

  test("E2E-03 duplicate callback is idempotent", async () => {
    test.skip(true, sandboxReady
      ? "Provider callback replay is not automated end-to-end; ALREADY_PAID idempotency is covered at settlement unit level."
      : "iyzico sandbox credentials are unset; provider callback replay is not run.");
  });

  test("E2E-04 guest claim binds the matching email", async () => {
    test.skip(true, sandboxReady
      ? "Guest activation claim journey is not automated in this pass."
      : "iyzico sandbox credentials are unset; guest activation claim journey is not run.");
  });

  test("E2E-05 authenticated purchase auto-claims", async () => {
    test.skip(true, sandboxReady
      ? "Browser/provider auto-claim journey is not automated end-to-end; finalize_authenticated_commerce_order is covered at settlement unit level."
      : "iyzico sandbox credentials are unset; browser/provider auto-claim journey is not run.");
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
