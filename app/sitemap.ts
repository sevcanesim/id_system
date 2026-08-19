import type { MetadataRoute } from "next";

const staticPages: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/urunler", changeFrequency: "weekly", priority: 0.9 },
  { path: "/urunler/nfc-kart", changeFrequency: "weekly", priority: 0.9 },
  { path: "/gizlilik", changeFrequency: "yearly", priority: 0.3 },
  { path: "/kvkk", changeFrequency: "yearly", priority: 0.3 },
  { path: "/hizmet-sartlari", changeFrequency: "yearly", priority: 0.3 },
  { path: "/mesafeli-satis-sozlesmesi", changeFrequency: "yearly", priority: 0.3 },
  { path: "/iade-iptal", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: "https://qr.yenomilabs.com", lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...staticPages.map((page) => ({
      url: `https://qr.yenomilabs.com${page.path}`,
      lastModified: now,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),

  ];
}
