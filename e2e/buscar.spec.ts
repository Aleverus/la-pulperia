import { expect, test } from "@playwright/test";

test("search reflows at 320px without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/buscar?q=queso");
  await page.locator(".search-form__filter-panel > summary").click();
  await expect(page.getByLabel("Clase de oferta")).toBeVisible();
  await expect(page.getByLabel("Forma de atención")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});

test("search controls follow query-only history changes", async ({ page }) => {
  await page.goto("/buscar?q=zambos");
  await page.getByLabel("¿Qué necesitás encontrar?").fill("queso");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page).toHaveURL(/q=queso/);

  const menuButton = page.getByLabel("Abrir menú principal");
  if (await menuButton.isVisible()) {
    await menuButton.click();
    await expect(page.getByRole("navigation", { name: "Menú principal" })).toBeVisible();
  }

  await page.goBack();
  await expect(page).toHaveURL(/q=zambos/);
  await expect(page.getByLabel("¿Qué necesitás encontrar?")).toHaveValue(
    "zambos",
  );
  if (await menuButton.isVisible()) {
    await expect(
      page.getByRole("navigation", { name: "Menú principal" }),
    ).toBeHidden();
  }
});

test("public search filters, sorts, tolerates typos, and explains no results", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success: PositionCallback) {
          success({
            coords: {
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              latitude: 14.5969,
              longitude: -87.831,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          });
        },
      },
    });
  });
  await page.goto("/buscar?q=zambos%20picantes");

  await expect(page.locator("article")).toHaveCount(2);
  await expect(
    page.locator("article").first().getByText("Disponible", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Información antigua")).toBeVisible();

  await page.getByLabel("Forma de atención").selectOption("mobile");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("La Canasta Móvil")).toBeVisible();
  await expect(page.getByText("Pulpería El Pino")).toHaveCount(0);

  await page.goto("/buscar?q=zambos%20picantes&orden=price_asc");
  await expect(page.getByLabel("Ordenar por")).toHaveValue("organic");
  const results = page.locator("article");
  await expect(results).toHaveCount(2);
  await expect(results.nth(0)).toContainText("La Canasta Móvil");
  await expect(results.nth(0)).toContainText("L 32.00 / bolsa");
  await expect(results.nth(1)).toContainText("Pulpería El Pino");
  await expect(results.nth(1)).toContainText("L 35.00 / bolsa");

  await page.getByRole("button", { name: "Cerca de mí" }).click();
  await expect(page).toHaveURL(/orden=nearby/);
  await expect(
    page.getByText(/m de distancia aproximada/).first(),
  ).toBeVisible();
  await expect(page.getByText("La Canasta Móvil")).toBeVisible();

  await page
    .getByLabel("¿Qué necesitás encontrar?")
    .fill("zambs picantes");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/q=zambs(?:\+|%20)picantes/);
  await expect(page.locator("article")).toHaveCount(2);

  await page
    .getByLabel("¿Qué necesitás encontrar?")
    .fill("tractor de orugas");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/q=tractor(?:\+|%20)de(?:\+|%20)orugas/);
  await expect(
    page.getByRole("heading", { name: "Sin coincidencias publicadas" }),
  ).toBeVisible();
  await expect(page.getByText(/Esto no demuestra que la oferta no exista/)).toBeVisible();

  await page.goto("/buscar?clase=scheduled_food");
  const food = page.locator("article").filter({ hasText: "Pan por encargo" });
  await expect(food).toBeVisible();
  await expect(food.getByText("Indicá cantidad y ventana")).toBeVisible();
  await expect(page.getByText("Zambos picantes")).toHaveCount(0);

  await page.getByLabel("Clase de oferta").selectOption("local_service");
  await page.getByRole("button", { name: "Buscar" }).click();
  const service = page
    .locator("article")
    .filter({ hasText: "Armado de canastas para evento" });
  await expect(service).toBeVisible();
  await expect(service.getByText("Cotización")).toBeVisible();
  await expect(service.getByText("Describí el trabajo")).toBeVisible();
  await expect(page.getByText("Pan por encargo")).toHaveCount(0);

  await page.getByLabel("Clase de oferta").selectOption("digital_offer");
  await page.getByLabel("Disponibilidad publicada").selectOption("on_request");
  await page.getByRole("button", { name: "Buscar" }).click();
  const digital = page
    .locator("article")
    .filter({ hasText: "Tarjeta digital para evento" });
  await expect(digital).toBeVisible();
  await expect(digital.getByText("Diseño Remoto Siguatepeque")).toBeVisible();
  await expect(
    digital.getByText("Siguatepeque y atención digital en Honduras"),
  ).toBeVisible();
  await expect(digital.getByText("Describí alcance o plan")).toBeVisible();
  await expect(page.getByText("Armado de canastas para evento")).toHaveCount(0);
});

test("extreme pagination falls back without overflowing the database", async ({
  page,
}) => {
  const response = await page.goto("/buscar?pagina=2147483647");
  expect(response?.status()).toBe(200);
  await expect(page.getByText("Página 1")).toHaveCount(0);
  await expect(page.locator("article").first()).toBeVisible();
});
