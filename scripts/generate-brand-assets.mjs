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

const BRAND_INK = { r: 17, g: 18, b: 20 };
const OXBLOOD = { r: 66, g: 21, b: 27 };
const RUST = { r: 138, g: 42, b: 47 };
const MINERAL = { r: 236, g: 237, b: 235 };

const crops = {
  monogram: { left: 125, top: 680, width: 275, height: 250 },
  monogramOneInk: { left: 455, top: 680, width: 290, height: 250 },
  wordmark: { left: 775, top: 700, width: 375, height: 210 },
  icon: { left: 1195, top: 675, width: 310, height: 285 },
};

await mkdir(brandDirectory, { recursive: true });

function alphaFromBrandColor(red, green, blue) {
  const lightest = Math.max(red, green, blue);
  const darkest = Math.min(red, green, blue);
  const saturation = lightest - darkest;
  return Math.max(0, Math.min(255, Math.round((saturation - 24) * 4.2)));
}

async function transparentCrop(region, tint) {
  const { data, info } = await sharp(sourcePath)
    .extract(region)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    const alpha = alphaFromBrandColor(data[index], data[index + 1], data[index + 2]);
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

async function recoloredCrop(region, baseTint, accentTint = baseTint) {
  const { data, info } = await sharp(sourcePath)
    .extract(region)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = alphaFromBrandColor(red, green, blue);
    const isWarmAccent = red > blue * 1.08 && red > green * 1.12;
    const tint = isWarmAccent ? accentTint : baseTint;
    data[index] = tint.r;
    data[index + 1] = tint.g;
    data[index + 2] = tint.b;
    data[index + 3] = alpha;
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
  const accentTint = name.endsWith("monogram") ? RUST : BRAND_INK;
  await (await recoloredCrop(region, BRAND_INK, accentTint))
    .png()
    .toFile(path.join(brandDirectory, `${name}.png`));
  await (await transparentCrop(oneInkRegion, OXBLOOD))
    .png()
    .toFile(path.join(brandDirectory, `${name}-one-ink.png`));
  await (await transparentCrop(oneInkRegion, MINERAL))
    .png()
    .toFile(path.join(brandDirectory, `${name}-inverse.png`));
  if (name.endsWith("monogram")) {
    await (await recoloredCrop(region, MINERAL, RUST))
      .png()
      .toFile(path.join(brandDirectory, `${name}-inverse-accent.png`));
  }
}

await Promise.all([
  writeTransparentVariants(
    "la-pulperia-monogram",
    crops.monogram,
    crops.monogramOneInk,
  ),
  writeTransparentVariants("la-pulperia-wordmark", crops.wordmark),
]);

const inverseMonogramPath = path.join(
  brandDirectory,
  "la-pulperia-monogram-inverse-accent.png",
);
const inverseWordmarkPath = path.join(
  brandDirectory,
  "la-pulperia-wordmark-inverse.png",
);
for (const [size, output] of [
  [512, "icon.png"],
  [180, "apple-icon.png"],
]) {
  const appIcon = await sharp(inverseMonogramPath)
    .resize(Math.round(size * 0.76), Math.round(size * 0.76), {
      fit: "contain",
      background: { ...OXBLOOD, alpha: 1 },
    })
    .flatten({ background: { ...OXBLOOD, alpha: 1 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: { ...OXBLOOD, alpha: 1 } },
  })
    .composite([{ input: appIcon, gravity: "center" }])
    .png()
    .toFile(path.join(repositoryRoot, "app", output));
}

const socialMonogram = await sharp(inverseMonogramPath)
  .resize(250, 250, {
    fit: "contain",
    background: { ...OXBLOOD, alpha: 1 },
  })
  .flatten({ background: { ...OXBLOOD, alpha: 1 } })
  .png()
  .toBuffer();
const socialWordmark = await sharp(inverseWordmarkPath)
  .resize(650, 250, {
    fit: "contain",
    background: { ...OXBLOOD, alpha: 1 },
  })
  .flatten({ background: { ...OXBLOOD, alpha: 1 } })
  .png()
  .toBuffer();
await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { ...OXBLOOD, alpha: 1 },
  },
})
  .composite([
    { input: socialMonogram, left: 110, top: 190 },
    { input: socialWordmark, left: 395, top: 190 },
  ])
  .png({ compressionLevel: 9 })
  .toFile(path.join(repositoryRoot, "app", "opengraph-image.png"));

console.log(`Brand assets generated from ${sourcePath}`);
