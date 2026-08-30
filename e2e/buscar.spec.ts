import { expect, test } from "@playwright/test";

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

  await page.getByLabel("Forma de atención").selectOption("mobile");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("La Canasta Móvil")).toBeVisible();
  await expect(page.getByText("Pulpería El Pino")).toHaveCount(0);

  await page.getByLabel("Forma de atención").selectOption("all");
  await page.getByLabel("Ordenar por").selectOption("price_asc");
  await page.getByRole("button", { name: "Buscar" }).click();
  const results = page.locator("article");
  await expect(results).toHaveCount(2);
  await expect(results.nth(0)).toContainText("La Canasta Móvil");
  await expect(results.nth(0)).toContainText("L 32.00");
  await expect(results.nth(1)).toContainText("Pulpería El Pino");
  await expect(results.nth(1)).toContainText("L 35.00");

  await page.getByRole("button", { name: "Cerca de mí" }).click();
  await expect(page).toHaveURL(/orden=nearby/);
  await expect(
    page.getByText(/m de distancia aproximada/).first(),
  ).toBeVisible();
  await expect(page.getByText("La Canasta Móvil")).toBeVisible();

  await page.getByLabel("Qué buscás").fill("zambs picantes");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.locator("article")).toHaveCount(2);

  await page.getByLabel("Qué buscás").fill("tractor de orugas");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(
    page.getByText("No hay ofertas publicadas para esa búsqueda."),
  ).toBeVisible();
});
