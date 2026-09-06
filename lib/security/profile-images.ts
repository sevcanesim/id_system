import sharp from "sharp";

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MIN_EDGE = 240;
const MAX_INPUT_PIXELS = 16_000_000;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type NormalizedProfileImage = {
  bytes: Uint8Array;
  contentType: "image/webp";
};

export async function normalizeProfileImage(source: Uint8Array): Promise<NormalizedProfileImage> {
  if (!source.byteLength || source.byteLength > MAX_SOURCE_BYTES) {
    throw new Error("PROFILE_IMAGE_SIZE_INVALID");
  }

  const inspector = sharp(source, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" });
  const metadata = await inspector.metadata();
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) {
    throw new Error("PROFILE_IMAGE_FORMAT_INVALID");
  }
  if (metadata.width < MIN_EDGE || metadata.height < MIN_EDGE) {
    throw new Error("PROFILE_IMAGE_DIMENSIONS_INVALID");
  }

  const ratio = metadata.width / metadata.height;
  if (ratio < 0.65 || ratio > 1.55) {
    throw new Error("PROFILE_IMAGE_RATIO_INVALID");
  }

  const bytes = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, effort: 4 })
    .toBuffer();

  if (!bytes.byteLength || bytes.byteLength > MAX_OUTPUT_BYTES) {
    throw new Error("PROFILE_IMAGE_OUTPUT_INVALID");
  }

  return { bytes, contentType: "image/webp" };
}

export function profileImageErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  if (code === "PROFILE_IMAGE_SIZE_INVALID") return "Profil fotoğrafı en fazla 5 MB olabilir.";
  if (code === "PROFILE_IMAGE_DIMENSIONS_INVALID") return "Profil fotoğrafı en az 240 × 240 piksel olmalı.";
  if (code === "PROFILE_IMAGE_RATIO_INVALID") return "Profil fotoğrafı portre veya kareye yakın olmalı.";
  return "Yalnızca geçerli JPG, PNG veya WebP görseller yükleyebilirsin.";
}
