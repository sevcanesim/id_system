import type { MetadataRoute } from "next";

import { publicCardOrigin } from "../lib/public-card/urls";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/urunler", "/urunler/", "/nasil-calisir", "/kurumsal", "/destek"],
      disallow: [
        "/api/", "/admin", "/dashboard", "/giris", "/hesabim", "/kartim", "/kartlarim",
        "/siparisler", "/siparislerim", "/olustur", "/aktivasyon", "/checkout",
        "/sepet", "/odeme/", "/kurumsal/panel", "/kurumsal/davet", "/p/", "/e/", "/qr/"
      ],
    },
    sitemap: `${publicCardOrigin()}/sitemap.xml`,
  };
}
