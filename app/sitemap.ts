import type { MetadataRoute } from "next";

import { publicCardOrigin } from "../lib/public-card/urls";

const staticPages: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/urunler", changeFrequency: "weekly", priority: 0.9 },
  { path: "/urunler/nfc-kart", changeFrequency: "weekly", priority: 0.9 },
  { path: "/nasil-calisir", changeFrequency: "weekly", priority: 0.8 },
  { path: "/kurumsal", changeFrequency: "weekly", priority: 0.8 },
  { path: "/destek", changeFrequency: "monthly", priority: 0.5 },
  { path: "/gizlilik", changeFrequency: "yearly", priority: 0.3 },
  { path: "/kvkk", changeFrequency: "yearly", priority: 0.3 },
  { path: "/hizmet-sartlari", changeFrequency: "yearly", priority: 0.3 },
  { path: "/mesafeli-satis-sozlesmesi", changeFrequency: "yearly", priority: 0.3 },
  { path: "/iade-iptal", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const origin = publicCardOrigin();
  return staticPages.map((page) => ({
    url: page.path === "/" ? origin : `${origin}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
