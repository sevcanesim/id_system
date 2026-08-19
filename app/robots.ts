import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/urunler", "/urunler/"],
      disallow: [
        "/api/", "/admin", "/dashboard", "/giris", "/hesabim", "/kartim", "/kartlarim",
        "/siparisler", "/siparislerim", "/olustur", "/aktivasyon", "/checkout",
        "/odeme/", "/kurumsal/panel", "/kurumsal/davet", "/p/", "/e/", "/qr/"
      ],
    },
    sitemap: "https://qr.yenomilabs.com/sitemap.xml",
  };
}
