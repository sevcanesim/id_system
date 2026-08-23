import { afterEach, describe, expect, it } from "vitest";

import sitemap from "./sitemap";

const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
});

describe("marketing sitemap", () => {
  it("lists public marketing routes on the configured origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toEqual([
      "https://example.test",
      "https://example.test/urunler",
      "https://example.test/urunler/nfc-kart",
      "https://example.test/nasil-calisir",
      "https://example.test/kurumsal",
      "https://example.test/destek",
      "https://example.test/gizlilik",
      "https://example.test/kvkk",
      "https://example.test/hizmet-sartlari",
      "https://example.test/mesafeli-satis-sozlesmesi",
      "https://example.test/iade-iptal",
    ]);
  });
});
