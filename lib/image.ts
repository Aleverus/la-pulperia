import sharp from "sharp";

export const OFFER_IMAGE_MAX_EDGE = 1600;
export const OFFER_IMAGE_MAX_SOURCE_EDGE = 6000;
export const OFFER_IMAGE_MAX_PIXELS = 16_000_000;
export const OFFER_IMAGE_MAX_OUTPUT_BYTES = 400_000;
export const OFFER_IMAGE_MAX_INPUT_BYTES = 3 * 1024 * 1024;
export const OFFER_IMAGE_MAX_COUNT = 4;
const OFFER_IMAGE_FORMATS = new Set(["jpeg", "png", "webp"]);

export function isOfferImageFileSizeAllowed(size: number): boolean {
  return Number.isSafeInteger(size) &&
    size > 0 &&
    size <= OFFER_IMAGE_MAX_INPUT_BYTES;
}

export async function processOfferImage(input: Buffer): Promise<Buffer> {
  if (!isOfferImageFileSizeAllowed(input.byteLength)) {
    throw new Error("image_invalid");
  }

  try {
    const source = sharp(input, {
      animated: false,
      failOn: "error",
      limitInputPixels: OFFER_IMAGE_MAX_PIXELS,
      pages: 1,
      sequentialRead: true,
    });
    const metadata = await source.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (
      !metadata.format ||
      !OFFER_IMAGE_FORMATS.has(metadata.format) ||
      width < 1 ||
      height < 1 ||
      width > OFFER_IMAGE_MAX_SOURCE_EDGE ||
      height > OFFER_IMAGE_MAX_SOURCE_EDGE ||
      width * height > OFFER_IMAGE_MAX_PIXELS ||
      (metadata.pages ?? 1) !== 1
    ) {
      throw new Error("image_invalid");
    }

    const transformed = source.rotate().resize({
      width: OFFER_IMAGE_MAX_EDGE,
      height: OFFER_IMAGE_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    });
    let quality = 80;
    let output = await encodeWebp(transformed, quality);
    while (output.byteLength > OFFER_IMAGE_MAX_OUTPUT_BYTES && quality > 40) {
      quality -= 10;
      output = await encodeWebp(transformed, quality);
    }

    if (output.byteLength > OFFER_IMAGE_MAX_OUTPUT_BYTES) {
      throw new Error("image_too_large");
    }

    return output;
  } catch (error) {
    if (error instanceof Error && error.message === "image_too_large") {
      throw error;
    }
    throw new Error("image_invalid");
  }
}

async function encodeWebp(
  input: ReturnType<typeof sharp>,
  quality: number,
): Promise<Buffer> {
  return input.clone().webp({ quality, effort: 4 }).toBuffer();
}
