const origin = "http://127.0.0.1:3001";
const cases = [
  ["explorar-320", "/mapa", 320, 720, "Explorar negocios en Siguatepeque"],
  ["explorar-390", "/mapa", 390, 844, "Explorar negocios en Siguatepeque"],
  ["explorar-1440", "/mapa", 1440, 900, "Explorar negocios en Siguatepeque"],
  ["catalogo-390", "/buscar", 390, 844, "Catálogo"],
  ["catalogo-1440", "/buscar", 1440, 900, "Catálogo"],
  ["vender-390", "/vender", 390, 844, "Empezá por una oferta real."],
  ["ingresar-390", "/ingresar", 390, 844, "Ingresar"],
  ["carrito-390", "/carrito", 390, 844, "Carrito"],
  ["no-encontrada-390", "/ruta-inexistente-7p", 390, 844, "Esta página no está disponible"],
];

(async () => {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const results = [];

  for (const [name, path, width, height, heading] of cases) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });

    const response = await page.goto(`${origin}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await page.getByRole("heading", { name: heading, exact: true }).waitFor({
      state: "attached",
    });
    await page.screenshot({
      path: `evidence/design-qa-7p/${name}.png`,
      caret: "initial",
    });

    results.push(
      await page.evaluate(
        ({ name, status, width }) => ({
          name,
          status,
          url: location.pathname + location.search,
          width,
          overflow: document.documentElement.scrollWidth - innerWidth,
          bodyHeight: document.body.scrollHeight,
          viewportHeight: innerHeight,
          title: document.title,
          heading: document.querySelector("h1")?.textContent?.trim() ?? null,
        }),
        { name, status: response?.status() ?? null, width },
      ),
    );
    results.at(-1).consoleErrors = [...new Set(errors)];
    await page.close();
  }

  const onlinePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  await onlinePage.goto(`${origin}/mapa`, { waitUntil: "domcontentloaded" });
  await onlinePage.getByRole("tab", { name: "En línea" }).click();
  await onlinePage.screenshot({
    path: "evidence/design-qa-7p/explorar-en-linea-390.png",
    caret: "initial",
  });
  results.push({
    name: "explorar-en-linea-390",
    url: await onlinePage.evaluate(() => location.pathname + location.search),
    pins: await onlinePage.locator(".map-pin").count(),
    overflow: await onlinePage.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  });
  await onlinePage.close();

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
