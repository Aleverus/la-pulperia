import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.resolve(
  repositoryRoot,
  "..",
  "Obra",
  "Referencias visuales",
  "logo-rotulo-hondureno-seleccionado-2026-09-01.png",
);
const brandDirectory = path.join(repositoryRoot, "public", "brand");

const COBALT = { r: 7, g: 59, b: 101 };
const IVORY = { r: 251, g: 245, b: 232 };
const WHITE = { r: 255, g: 253, b: 248 };

const crops = {
  monogram: { left: 125, top: 680, width: 275, height: 250 },
  monogramOneInk: { left: 455, top: 680, width: 290, height: 250 },
  wordmark: { left: 775, top: 700, width: 375, height: 210 },
  icon: { left: 1195, top: 675, width: 310, height: 285 },
};

await mkdir(brandDirectory, { recursive: true });

function alphaFromIvory(red, green, blue) {
  const darkest = Math.min(red, green, blue);
  const lightest = Math.max(red, green, blue);
  const saturation = lightest - darkest;
  const darknessSignal = Math.max(0, 225 - darkest) * 8;
  const colorSignal = Math.max(0, saturation - 55) * 6;
  return Math.max(0, Math.min(255, Math.round(Math.max(darknessSignal, colorSignal))));
}

async function transparentCrop(region, tint) {
  const { data, info } = await sharp(sourcePath)
    .extract(region)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    const alpha = alphaFromIvory(data[index], data[index + 1], data[index + 2]);
    data[index + 3] = alpha;
    if (tint) {
      data[index] = tint.r;
      data[index + 1] = tint.g;
      data[index + 2] = tint.b;
    }
  }

  return sharp(data, { raw: info })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 1 })
    .extend({
      top: 12,
      right: 12,
      bottom: 12,
      left: 12,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
}

async function writeTransparentVariants(name, region, oneInkRegion = region) {
  await (await transparentCrop(region)).png().toFile(path.join(brandDirectory, `${name}.png`));
  await (await transparentCrop(oneInkRegion, COBALT))
    .png()
    .toFile(path.join(brandDirectory, `${name}-one-ink.png`));
  await (await transparentCrop(oneInkRegion, WHITE))
    .png()
    .toFile(path.join(brandDirectory, `${name}-inverse.png`));
}

await Promise.all([
  writeTransparentVariants(
    "la-pulperia-monogram",
    crops.monogram,
    crops.monogramOneInk,
  ),
  writeTransparentVariants("la-pulperia-wordmark", crops.wordmark),
]);

const icon = sharp(sourcePath).extract(crops.icon);
await icon
  .clone()
  .resize(512, 512, { fit: "contain", background: IVORY })
  .png()
  .toFile(path.join(repositoryRoot, "app", "icon.png"));
await icon
  .clone()
  .resize(180, 180, { fit: "contain", background: { ...IVORY, alpha: 1 } })
  .flatten({ background: IVORY })
  .png()
  .toFile(path.join(repositoryRoot, "app", "apple-icon.png"));

await sharp(sourcePath)
  .extract({ left: 45, top: 55, width: 1445, height: 610 })
  .resize(1200, 630, { fit: "contain", background: IVORY })
  .png({ compressionLevel: 9 })
  .toFile(path.join(repositoryRoot, "app", "opengraph-image.png"));

console.log(`Brand assets generated from ${sourcePath}`);
