import { expect, test } from "@playwright/test";

const sensitivePages = ["/giris", "/checkout", "/aktivasyon"];

test.describe("security response contract", () => {
  for (const path of sensitivePages) {
    test(`${path} is private and CSP protected`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.ok(), path).toBeTruthy();

      const csp = response.headers()["content-security-policy"] ?? "";
      const cacheControl = response.headers()["cache-control"] ?? "";
      const robots = response.headers()["x-robots-tag"] ?? "";
      const requestId = response.headers()["x-request-id"] ?? "";

      expect(csp, path).toContain("script-src");
      expect(csp, path).toMatch(/'nonce-[^']+'/);
      expect(cacheControl, path).toContain("private");
      expect(cacheControl, path).toContain("no-store");
      expect(robots, path).toContain("noindex");
      expect(requestId, path).toBeTruthy();
    });
  }

  test("payment and activation surfaces suppress referrers", async ({ request }) => {
    for (const path of ["/checkout", "/aktivasyon"]) {
      const response = await request.get(path);
      expect(response.ok(), path).toBeTruthy();
      expect(response.headers()["referrer-policy"] ?? "", path).toBe("no-referrer");
    }
  });

  test("protected account pages redirect anonymous users to login", async ({ request }) => {
    for (const path of ["/hesabim", "/kartim", "/kurumsal/panel"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBeGreaterThanOrEqual(300);
      expect(response.status(), path).toBeLessThan(400);
      const location = response.headers()["location"] ?? "";
      expect(location, path).toContain("/giris");
      expect(location, path).toContain("next=");
    }
  });
});
