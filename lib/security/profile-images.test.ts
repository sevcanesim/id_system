import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { normalizeProfileImage } from "./profile-images";

describe("profile image normalization", () => {
  it("re-encodes accepted images as metadata-free WebP", async () => {
    const source = await sharp({ create: { width: 640, height: 640, channels: 3, background: "#c79a3b" } })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: "private" } } })
      .toBuffer();

    const normalized = await normalizeProfileImage(source);
    const metadata = await sharp(normalized.bytes).metadata();
    expect(normalized.contentType).toBe("image/webp");
    expect(metadata.format).toBe("webp");
    expect(metadata.exif).toBeUndefined();
    expect(metadata.width).toBe(640);
  });

  it("rejects undersized and non-image payloads", async () => {
    const tiny = await sharp({ create: { width: 120, height: 120, channels: 3, background: "#000000" } }).png().toBuffer();
    await expect(normalizeProfileImage(tiny)).rejects.toThrow("PROFILE_IMAGE_DIMENSIONS_INVALID");
    await expect(normalizeProfileImage(new TextEncoder().encode("not-an-image"))).rejects.toThrow();
  });
});
