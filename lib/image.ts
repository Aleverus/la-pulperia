import sharp from "sharp";

export const OFFER_IMAGE_MAX_EDGE = 1600;
export const OFFER_IMAGE_MAX_OUTPUT_BYTES = 400_000;
export const OFFER_IMAGE_MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const OFFER_IMAGE_MAX_COUNT = 4;

export async function processOfferImage(input: Buffer): Promise<Buffer> {
  if (input.byteLength === 0 || input.byteLength > OFFER_IMAGE_MAX_INPUT_BYTES) {
    throw new Error("image_invalid");
  }

  let quality = 80;
  let output = await encodeWebp(input, quality);
  while (output.byteLength > OFFER_IMAGE_MAX_OUTPUT_BYTES && quality > 40) {
    quality -= 10;
    output = await encodeWebp(input, quality);
  }

  if (output.byteLength > OFFER_IMAGE_MAX_OUTPUT_BYTES) {
    throw new Error("image_too_large");
  }

  return output;
}

async function encodeWebp(input: Buffer, quality: number): Promise<Buffer> {
  try {
    return await sharp(input, { failOn: "none" })
      .rotate()
      .resize({
        width: OFFER_IMAGE_MAX_EDGE,
        height: OFFER_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toBuffer();
  } catch {
    throw new Error("image_invalid");
  }
}
