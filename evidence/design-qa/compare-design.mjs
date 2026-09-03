import sharp from "sharp";

const sourcePath =
  "C:/Users/ozela/Documents/Dogma HQ/Proyectos/La Pulpería/Obra/Referencias visuales/direccion-visual-base-movil-aprobada-2026-08-30.png";
const implementationPath =
  "C:/Users/ozela/Documents/Dogma HQ/Proyectos/La Pulpería/Código/.codex-work/design-qa/implementation-mobile-search-final.jpg";
const outputDirectory =
  "C:/Users/ozela/Documents/Dogma HQ/Proyectos/La Pulpería/Código/.codex-work/design-qa";

const width = 375;
const gap = 24;
const labelHeight = 44;
const background = "#172720";

const source = await sharp(sourcePath).resize({ width }).jpeg({ quality: 92 }).toBuffer();
const implementation = await sharp(implementationPath).jpeg({ quality: 92 }).toBuffer();

await compose({
  left: source,
  right: implementation,
  output: `${outputDirectory}/comparison-full.jpg`,
});

await compose({
  left: await sharp(source).extract({ left: 0, top: 0, width, height: 430 }).toBuffer(),
  right: await sharp(implementation)
    .extract({ left: 0, top: 0, width, height: 430 })
    .toBuffer(),
  output: `${outputDirectory}/comparison-header-search.jpg`,
});

await compose({
  left: await sharp(source).extract({ left: 0, top: 455, width, height: 350 }).toBuffer(),
  right: await sharp(implementation)
    .extract({ left: 0, top: 780, width, height: 430 })
    .toBuffer(),
  output: `${outputDirectory}/comparison-results.jpg`,
});

async function compose({ left, right, output }) {
  const [leftMeta, rightMeta] = await Promise.all([
    sharp(left).metadata(),
    sharp(right).metadata(),
  ]);
  const contentHeight = Math.max(leftMeta.height, rightMeta.height);
  const canvasWidth = width * 2 + gap;
  const canvasHeight = contentHeight + labelHeight;

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 3,
      background,
    },
  })
    .composite([
      { input: label("Fuente aprobada", width), left: 0, top: 0 },
      {
        input: label("Implementación actual", width),
        left: width + gap,
        top: 0,
      },
      { input: left, left: 0, top: labelHeight },
      { input: right, left: width + gap, top: labelHeight },
    ])
    .jpeg({ quality: 92 })
    .toFile(output);
}

function label(text, labelWidth) {
  return Buffer.from(`
    <svg width="${labelWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${background}" />
      <text x="16" y="29" fill="#fffaf0" font-family="Arial, sans-serif" font-size="17" font-weight="700">${text}</text>
    </svg>
  `);
}
