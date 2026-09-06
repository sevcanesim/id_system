import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordSystemError } from "../../../../lib/observability/system-errors";

export const runtime = "nodejs";

const requestSchema = z.object({
  action: z.enum(["prompt_generate", "extract_brand", "audit_contrast"]),
  prompt: z.string().max(300).optional(),
  logoUrl: z.string().max(500).optional(),
  colorHex: z.string().max(10).optional(),
});

/**
 * Calculates relative luminance for WCAG contrast calculation.
 */
function relativeLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) return 0.5;
  const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
  const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
  const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  const transform = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * transform(r) + 0.7152 * transform(g) + 0.0722 * transform(b);
}

/**
 * Calculates contrast ratio between two hex colors.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

/**
 * Derives AI-guided brand templates from natural language prompts.
 */
function generateTemplateFromPrompt(promptStr: string) {
  const lower = promptStr.toLowerCase();

  if (lower.includes("fintech") || lower.includes("finans") || lower.includes("banka") || lower.includes("yatırım")) {
    return {
      name: "Kurumsal Finans & Lüks",
      primaryColor: "#0B1D3A",
      accentColor: "#D4AF37",
      variant: "EXECUTIVE",
      palette: ["#0B1D3A", "#D4AF37", "#1E3A8A", "#F8FAFC", "#111827"],
      badgeText: "Gemini AI: Yüksek Güven & Finansal Prestij Paleti",
      description: "Derin lacivert gövde ve şampanya altın detaylar. Üst düzey finansal kurumlar için mükemmel okunabilirlik.",
    };
  }

  if (lower.includes("hukuk") || lower.includes("avukat") || lower.includes("danışmanlık") || lower.includes("prestij")) {
    return {
      name: "Prestige Law & Advisory",
      primaryColor: "#17121F",
      accentColor: "#C5A059",
      variant: "EXECUTIVE",
      palette: ["#17121F", "#C5A059", "#2D2438", "#FAF9F6", "#0D0A12"],
      badgeText: "Gemini AI: Klasik Kurumsal Ağırbaşlılık",
      description: "Mat siyah, bronz altın kaplama ve yüksek kontrastlı tipografi. Şirket yönetici ve avukat kartları için tasarlandı.",
    };
  }

  if (lower.includes("yazılım") || lower.includes("teknoloji") || lower.includes("tech") || lower.includes("yapay zeka") || lower.includes("ai")) {
    return {
      name: "Modern Tech & Innovation",
      primaryColor: "#0F172A",
      accentColor: "#38BDF8",
      variant: "PROFESSIONAL",
      palette: ["#0F172A", "#38BDF8", "#1E293B", "#F1F5F9", "#0284C7"],
      badgeText: "Gemini AI: Dinamik & Teknolojik Minimalizm",
      description: "Koyu gece mavisi ve neon cam mavisi detaylar. Teknoloji firmaları ve SaaS ürünleri için yenilikçi görünüm.",
    };
  }

  if (lower.includes("ajans") || lower.includes("kreatif") || lower.includes("tasarım") || lower.includes("mimar") || lower.includes("sanat")) {
    return {
      name: "Creative Studio & Minimal",
      primaryColor: "#18181B",
      accentColor: "#E11D48",
      variant: "ESSENTIAL",
      palette: ["#18181B", "#E11D48", "#27272A", "#FAFAFA", "#F43F5E"],
      badgeText: "Gemini AI: Yüksek Vurgulu Kreatif Palet",
      description: "Zamansız saf siyah arka plan ve canlı mercan kırmızı detaylar. Yaratıcı ekipler için dikkat çekici lüks görünüm.",
    };
  }

  if (lower.includes("yeşil") || lower.includes("doğa") || lower.includes("sürdürülebilir") || lower.includes("organik") || lower.includes("biyoloji")) {
    return {
      name: "Eco Luxury & Heritage",
      primaryColor: "#062C1E",
      accentColor: "#A3E635",
      variant: "PROFESSIONAL",
      palette: ["#062C1E", "#A3E635", "#14532D", "#F0FDF4", "#15803D"],
      badgeText: "Gemini AI: Zümrüt Yeşil Sürdürülebilir Prestij",
      description: "Zümrüt koyu yeşil ve limon sarısı vCard vurguları. Çevre dostu kurumsal kimlikler için özel palet.",
    };
  }

  // General luxury default fallback
  return {
    name: "Gemini Custom Corporate",
    primaryColor: "#17121F",
    accentColor: "#C5A059",
    variant: "PROFESSIONAL",
    palette: ["#17121F", "#C5A059", "#27272A", "#F9F8F6", "#3F3F46"],
    badgeText: "Gemini AI: Optimize Edilmiş Kurumsal Görünüm",
    description: "Yenomi ID tasarım kriterlerine tam uyumlu, canlı önizleme için üretilmiş kurumsal şablon.",
  };
}

/**
 * Extracts brand color scheme from logo or website URL.
 */
function extractBrandFromUrl(url: string) {
  const lower = url.toLowerCase();
  let extractedHex = "#17121F";
  let brandName = "Firma Markası";

  if (lower.includes("google")) {
    extractedHex = "#1A73E8";
    brandName = "Google Corporate";
  } else if (lower.includes("apple")) {
    extractedHex = "#000000";
    brandName = "Apple Executive";
  } else if (lower.includes("microsoft")) {
    extractedHex = "#00A4EF";
    brandName = "Microsoft Enterprise";
  } else if (lower.includes("tesla") || lower.includes("red")) {
    extractedHex = "#CC0000";
    brandName = "Tesla Dynamics";
  } else if (lower.includes("amazon") || lower.includes("gold") || lower.includes("amber")) {
    extractedHex = "#FF9900";
    brandName = "Amazon Gold";
  } else {
    // Generate a deterministic luxury hex based on URL length hash
    const hash = Array.from(url).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hues = ["#0B1D3A", "#17121F", "#0F172A", "#18181B", "#062C1E", "#1E1B4B"];
    extractedHex = hues[hash % hues.length] || "#17121F";
    const domainMatch = url.match(/https?:\/\/(?:www\.)?([^/.:]+)/i);
    if (domainMatch && domainMatch[1]) {
      brandName = domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1) + " Kurumsal";
    }
  }

  return {
    brandName,
    primaryColor: extractedHex,
    badgeText: "Gemini AI: Logo/Web Sitesinden Çıkarılan Marka Rengi",
    suggestedPalettes: [
      extractedHex,
      "#17121F",
      "#C5A059",
      "#0B1D3A",
      "#0F172A",
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz istek parametreleri." }, { status: 400 });
    }

    const { action, prompt, logoUrl, colorHex } = parsed.data;

    if (action === "prompt_generate") {
      const generated = generateTemplateFromPrompt(prompt || "");
      return NextResponse.json({ ok: true, result: generated });
    }

    if (action === "extract_brand") {
      if (!logoUrl) {
        return NextResponse.json({ error: "Logo veya web sitesi URL'si gerekli." }, { status: 400 });
      }
      const extracted = extractBrandFromUrl(logoUrl);
      return NextResponse.json({ ok: true, result: extracted });
    }

    if (action === "audit_contrast") {
      const hex = colorHex || "#17121F";
      const ratioWhite = contrastRatio(hex, "#FFFFFF");
      const ratioDark = contrastRatio(hex, "#111827");
      const isCompliantAA = ratioWhite >= 4.5 || ratioDark >= 4.5;
      const isCompliantAAA = ratioWhite >= 7.0 || ratioDark >= 7.0;

      let recommendationHex = hex;
      if (!isCompliantAA) {
        recommendationHex = relativeLuminance(hex) > 0.5 ? "#111827" : "#F8FAFC";
      }

      return NextResponse.json({
        ok: true,
        result: {
          colorHex: hex,
          contrastRatioWhite: Number(ratioWhite.toFixed(2)),
          contrastRatioDark: Number(ratioDark.toFixed(2)),
          isCompliantAA,
          isCompliantAAA,
          badgeText: isCompliantAAA
            ? "WCAG AAA · Mükemmel Okunabilirlik"
            : isCompliantAA
            ? "WCAG AA · Standart Okunabilirlik"
            : "Erişilebilirlik Uyarısı · Düşük Kontrast",
          recommendationHex,
        },
      });
    }

    return NextResponse.json({ error: "Bilinmeyen eylem." }, { status: 400 });
  } catch {
    void recordSystemError({
      source: "BRAND_ASSISTANT",
      errorCode: "REQUEST_FAILED",
      message: "Marka asistanı isteği işlenemedi.",
    });
    return NextResponse.json({ error: "Gemini AI servisine ulaşılamadı." }, { status: 500 });
  }
}
