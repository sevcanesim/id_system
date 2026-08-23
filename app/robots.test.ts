import { afterEach, describe, expect, it } from "vitest";

import robots from "./robots";

const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

afterEach(() => {
  if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
});

describe("marketing robots", () => {
  it("allows public marketing routes on the configured origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test/";
    const document = robots();
    expect(document.sitemap).toBe("https://example.test/sitemap.xml");
    expect(document.rules).toEqual(expect.objectContaining({
      allow: ["/", "/urunler", "/urunler/", "/nasil-calisir", "/kurumsal", "/destek"],
    }));
  });
});
