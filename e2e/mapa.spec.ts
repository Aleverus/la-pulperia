import { expect, test } from "@playwright/test";

test("physical map hides virtuals and explains GPS states", async ({
  page,
  context,
}) => {
  await page.goto("/mapa");
  const list = page.getByRole("list", { name: "Negocios físicos" });
  await expect(page.locator('[data-map-status="ready"]')).toBeVisible();
  await expect(page.getByText("OpenStreetMap contributors")).toBeVisible();
  await expect(list.getByText("Pulpería El Pino")).toBeVisible();
  await expect(list.getByText("La Canasta Virtual")).toHaveCount(0);

  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await expect(page.getByText("No hay permiso de ubicación")).toBeVisible();

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 14.09, longitude: -87.19 });
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await expect(page.getByText("fuera de Siguatepeque")).toBeVisible();

  await context.setGeolocation({ latitude: 14.5969, longitude: -87.831 });
  await page.getByRole("button", { name: "Usar mi ubicación" }).click();
  await expect(list.getByText(/m$/).first()).toBeVisible();

  await list.getByRole("button", { name: "Pulpería El Pino" }).click();
  await expect(
    page
      .getByRole("region", { name: "Mapa de Siguatepeque" })
      .getByRole("button", { name: "Pulpería El Pino" }),
  ).toHaveAttribute("aria-current", "true");
});
