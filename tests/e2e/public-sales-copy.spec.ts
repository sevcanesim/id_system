import { expect, test } from "@playwright/test";

test.describe("public sales copy contracts", () => {
  test("homepage states the individual Premium value proposition and trust boundary", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: /Kimliğiniz/ })).toBeVisible();
    await expect(page.getByText("BİREYSEL PREMIUM · NFC + QR", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Premium deneyimi keşfet/ }).first()).toHaveAttribute("href", "/urunler/nfc-kart?paket=premium");
    await expect(page.getByText("Bireysel NFC", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Bireysel Premium", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Kimliğiniz her tanışmada hazır, her zaman sizin kontrolünüzde.", { exact: true })).toBeVisible();
  });

  test("product catalogue makes individual NFC and individual Premium separate levels", async ({ page }) => {
    await page.goto("/urunler");

    await expect(page.getByRole("heading", { level: 1, name: /Tanıştığınız anda/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Bireysel Premium" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Bireysel NFC" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Premium deneyimi seç" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sade kartımı seç" })).toBeVisible();
  });

  test("NFC product page retains the clear product and payment boundary", async ({ page }) => {
    await page.goto("/urunler/nfc-kart?paket=premium");

    await expect(page.getByRole("heading", { level: 1, name: /Fiziksel kartın/ })).toBeVisible();
    await expect(page.getByText("Bireysel Premium", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Premium deneyimi seç/ })).toBeVisible();
    await expect(page.getByText("Kart numaran Yenomi’de tutulmaz", { exact: true })).toBeVisible();
  });

  test("corporate page sells a managed team identity system rather than a card list", async ({ page }) => {
    await page.goto("/kurumsal");

    await expect(page.getByRole("heading", { level: 1, name: /Her çalışan/ })).toBeVisible();
    await expect(page.getByText("YENOMI BUSINESS · KURUMSAL DİJİTAL KİMLİK", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ekibiniz için doğru planı seçin/ })).toHaveAttribute("href", "#kapasite");
    await expect(page.getByRole("heading", { level: 2, name: "Ekibiniz büyürken marka standardınız dağılmasın." })).toBeVisible();
    await expect(page.getByRole("button", { name: "10 kişilik planı seç" })).toBeVisible();
  });

  test("corporate plans remain fully readable without horizontal scrolling on mobile", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "mobile pricing layout");
    await page.goto("/kurumsal");

    const plans = page.locator(".corporate-pack-table-wrap");
    await expect(plans).toBeVisible();
    await expect(page.locator(".corporate-pack-table thead")).toBeHidden();
    expect(await plans.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await expect(page.getByText("Yıllık yenileme", { exact: true }).first()).toBeVisible();
  });

  test("how-it-works and support stay concise while preserving a next action", async ({ page }) => {
    await page.goto("/nasil-calisir");
    await expect(page.getByRole("heading", { level: 1, name: /Kimliğinizi paylaşın/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Premium deneyimi seç/ }).first()).toHaveAttribute("href", "/urunler/nfc-kart?paket=premium");

    await page.goto("/destek");
    await expect(page.getByRole("heading", { level: 1, name: /Doğru yanıt/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Yanıtı bul" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Desteğe yaz/ })).toBeVisible();
  });

  test("cart and checkout use confidence-building, accurate action language", async ({ page }) => {
    await page.goto("/sepet");
    await expect(page.getByRole("heading", { level: 1, name: "Sepetin şu anda boş." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Premium deneyimi seç" })).toHaveAttribute("href", "/urunler/nfc-kart?paket=premium");

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { level: 1, name: "Siparişini güvenle tamamla." })).toBeVisible();
    await expect(page.getByText(/Kart bilgilerin yalnızca PayTR’da işlenir/)).toBeVisible();
  });

  test("payment exception states preserve the next safe action", async ({ page }) => {
    await page.goto("/odeme/paytr");
    await expect(page.getByRole("heading", { level: 1, name: "Güvenli ödeme bağlantın artık geçerli değil." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sipariş özetine dön" })).toHaveAttribute("href", "/checkout");

    await page.goto("/odeme/basarisiz");
    await expect(page.getByRole("heading", { level: 1, name: "Ödeme tamamlanmadı. Siparişin korunuyor." })).toBeVisible();
    await expect(page.getByText(/Yeni sepet kurmana gerek yok/)).toBeVisible();
  });
});
