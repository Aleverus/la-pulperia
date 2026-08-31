import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  isOfferImageFileSizeAllowed,
  OFFER_IMAGE_MAX_INPUT_BYTES,
  processOfferImage,
} from "./image";

describe("processOfferImage", () => {
  it("converts to WebP, strips EXIF and keeps the pixel payload", async () => {
    const source = await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: { r: 180, g: 40, b: 20 },
      },
    })
      .jpeg()
      .withExif({
        IFD0: { Copyright: "no-debe-sobrevivir", Artist: "secreto" },
      })
      .toBuffer();

    const sourceMeta = await sharp(source).metadata();
    expect(sourceMeta.exif).toBeTruthy();

    const output = await processOfferImage(source);
    const meta = await sharp(output).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.exif).toBeUndefined();
    expect(meta.width).toBe(32);
    expect(meta.height).toBe(24);
  });

  it("rejects an empty buffer", async () => {
    await expect(processOfferImage(Buffer.alloc(0))).rejects.toThrow(
      "image_invalid",
    );
  });

  it("rejects bytes above the input budget before decoding", async () => {
    expect(isOfferImageFileSizeAllowed(OFFER_IMAGE_MAX_INPUT_BYTES)).toBe(true);
    expect(isOfferImageFileSizeAllowed(OFFER_IMAGE_MAX_INPUT_BYTES + 1)).toBe(
      false,
    );
    await expect(
      processOfferImage(Buffer.alloc(OFFER_IMAGE_MAX_INPUT_BYTES + 1)),
    ).rejects.toThrow("image_invalid");
  });

  it("rejects a compressed image whose pixel dimensions exceed the budget", async () => {
    const compressedPixelBomb = await sharp({
      create: {
        width: 4100,
        height: 4100,
        channels: 3,
        background: { r: 1, g: 1, b: 1 },
      },
    })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();

    expect(compressedPixelBomb.byteLength).toBeLessThan(
      OFFER_IMAGE_MAX_INPUT_BYTES,
    );
    await expect(processOfferImage(compressedPixelBomb)).rejects.toThrow(
      "image_invalid",
    );
  });

  it("rejects unsupported image formats", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
    );
    await expect(processOfferImage(svg)).rejects.toThrow("image_invalid");
  });
});
