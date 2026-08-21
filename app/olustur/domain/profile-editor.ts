import { normalizeCardSlug, RESERVED_CARD_SLUGS, validateCardSlug } from "../../../lib/validation/slug";
import type { EditableCardData } from "../../CardTemplate";

export type CardData = EditableCardData;

export type UploadedImage = {
  url: string;
  path: string | null;
  uploaded: boolean;
};

export const INITIAL_CARD_DATA: CardData = {
  name: "", role: "", company: "", phone: "", whatsapp: "", email: "", website: "",
  linkedin: "", instagram: "", location: "", image: "", bio: "",
};

const STRUCTURAL_DRAFT_KEYS = ["name", "role", "company", "website", "linkedin", "instagram", "location", "bio"] as const;

export function sanitizeCardDraft(value: unknown): CardData {
  const incoming = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const next: CardData = { ...INITIAL_CARD_DATA };
  for (const key of STRUCTURAL_DRAFT_KEYS) {
    const candidate = incoming[key];
    if (typeof candidate === "string") next[key] = candidate;
  }
  return next;
}

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isSupportedImageMimeType(value: string) {
  return IMAGE_MIME_TYPES.has(value);
}

export function normalizeProfileSlug(value: string) {
  return normalizeCardSlug(value).slice(0, 40);
}

export function createProfileSlug(name: string) {
  const normalized = normalizeProfileSlug(name) || "kartim";
  const reservedKey = normalized.replace(/-/g, "");
  return RESERVED_CARD_SLUGS.has(reservedKey) ? `${reservedKey}-kart` : normalized;
}

export function validateProfileSlug(value: string) {
  return validateCardSlug(value);
}

export function storagePathFromPublicUrl(url: string) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/profile-images/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

export async function ensureRealImage(file: File) {
  if (!IMAGE_MIME_TYPES.has(file.type)) throw new Error("Yalnızca JPG, PNG veya WebP görsel yükleyebilirsin.");
  if (file.size > 5_000_000) throw new Error("Profil fotoğrafı en fazla 5 MB olabilir.");

  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (image.naturalWidth < 240 || image.naturalHeight < 240) {
          reject(new Error("Profil fotoğrafı en az 240 × 240 piksel olmalı."));
          return;
        }
        const ratio = image.naturalWidth / image.naturalHeight;
        if (ratio < 0.65 || ratio > 1.55) {
          reject(new Error("Profil fotoğrafı için portre veya kare bir görsel seçmelisin; ekran görüntüleri kullanılamaz."));
          return;
        }
        resolve();
      };
      image.onerror = () => reject(new Error("Seçilen dosya geçerli bir görsel değil."));
      image.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
