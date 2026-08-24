import { expect, test } from "@playwright/test";

test("buyer search, multi-seller cart, login, and two WhatsApp handoffs", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Qué buscás").fill("zambos picantes");
  await page.getByRole("button", { name: "Buscar" }).click();

  const pino = page.locator("article").filter({ hasText: "Pulpería El Pino" });
  const canasta = page.locator("article").filter({ hasText: "La Canasta Virtual" });
  await expect(pino).toBeVisible();
  await expect(canasta).toBeVisible();
  await expect(page.getByText("Pan de yema")).toHaveCount(0);

  await pino.getByRole("link", { name: "Zambos picantes" }).click();
  const firstAdd = page.getByRole("button", { name: "Agregar al carrito" });
  await firstAdd.click();
  await expect(page.getByRole("button", { name: "En el carrito" })).toBeVisible();

  await page.goto("/buscar?q=zambos%20picantes");
  await page
    .locator("article")
    .filter({ hasText: "La Canasta Virtual" })
    .getByRole("link", { name: "Zambos picantes" })
    .click();
  const secondAdd = page.getByRole("button", { name: "Agregar al carrito" });
  await secondAdd.click();
  await expect(page.getByRole("button", { name: "En el carrito" })).toBeVisible();

  await page.getByRole("link", { name: "Carrito" }).click();
  await expect(page.getByRole("heading", { name: "Pulpería El Pino" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "La Canasta Virtual" })).toBeVisible();

  await page.getByRole("link", { name: "Ingresar para preparar solicitudes" }).click();
  await page.getByLabel("Correo", { exact: true }).fill("comprador@local.test");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("pulperia-local");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByRole("heading", { name: "Carrito" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pulpería El Pino" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "La Canasta Virtual" })).toBeVisible();

  await page.getByRole("button", { name: "Preparar solicitudes" }).click();
  await expect(page.getByRole("heading", { name: "Solicitudes por vendedor" })).toBeVisible();

  const pinoWa = page.getByRole("link", { name: "Abrir WhatsApp de Pulpería El Pino" });
  const canastaWa = page.getByRole("link", {
    name: "Abrir WhatsApp de La Canasta Virtual",
  });
  await expect(pinoWa).toBeVisible();
  await expect(canastaWa).toBeVisible();
  await expect(pinoWa).toHaveAttribute("href", /https:\/\/wa\.me\/50499991111/);
  await expect(canastaWa).toHaveAttribute("href", /https:\/\/wa\.me\/50499992222/);

  await expect(page.getByText("Solicitud preparada").first()).toBeVisible();
  await expect(page.getByText("eso no es un mensaje enviado", { exact: false })).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await pinoWa.click();
  const popup = await popupPromise;
  expect(popup.url()).toMatch(/50499991111/);
  expect(popup.url()).toMatch(/confirman/);
  await popup.close();
  await expect(async () => {
    await page.reload();
    await expect(page.getByText("WhatsApp abierto").first()).toBeVisible();
  }).toPass();
  await expect(page.getByText("Solicitud preparada")).toBeVisible();
});
