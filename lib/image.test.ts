import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processOfferImage } from "./image";

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
});
