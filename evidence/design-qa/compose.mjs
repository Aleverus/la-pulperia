import sharp from "sharp";

const root = "C:/Users/ozela/Documents/Dogma HQ/Proyectos/La Pulpería";
const qa = `${root}/Código/.codex-work/design-qa`;

const reference = await sharp(
  `${root}/Obra/Referencias visuales/logo-rotulo-hondureno-seleccionado-2026-09-01.png`,
)
  .extract({ left: 45, top: 55, width: 1445, height: 610 })
  .resize(560, 237, { fit: "contain", background: "#fbf5e8" })
  .png()
  .toBuffer();

const publicView = await sharp(`${qa}/7v4-public-390.png`)
  .extract({ left: 0, top: 0, width: 375, height: 844 })
  .resize(375, 844)
  .png()
  .toBuffer();

const sellerView = await sharp(`${qa}/7v4-seller-390.png`)
  .extract({ left: 0, top: 0, width: 375, height: 844 })
  .resize(375, 844)
  .png()
  .toBuffer();

await sharp({
  create: {
    width: 1420,
    height: 940,
    channels: 4,
    background: "#fbf5e8",
  },
})
  .composite([
    { input: reference, left: 40, top: 55 },
    { input: publicView, left: 600, top: 48 },
    { input: sellerView, left: 1010, top: 48 },
  ])
  .png()
  .toFile(`${qa}/7v4-reference-public-seller.png`);
