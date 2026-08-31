import { expect, test } from "@playwright/test";

test("buyer search, multi-seller cart, login, and two WhatsApp handoffs", async ({
  browser,
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("¿Qué necesitás encontrar?")
    .fill("zambos picantes");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(/\/buscar\?q=zambos(?:\+|%20)picantes/);

  const pino = page
    .locator("article")
    .filter({ hasText: "Pulpería El Pino" })
    .filter({ hasText: "Zambos picantes" });
  const canasta = page
    .locator("article")
    .filter({ hasText: "La Canasta Móvil" })
    .filter({ hasText: "Zambos picantes" });
  await expect(pino).toBeVisible();
  await expect(canasta).toBeVisible();
  await expect(page.getByText("Pan de yema")).toHaveCount(0);

  await pino.getByRole("link", { name: "Zambos picantes" }).click();
  const firstAdd = page.getByRole("button", { name: "Agregar al carrito" });
  await firstAdd.click();
  await expect(page.getByRole("button", { name: "En el carrito" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Carrito (1)" })).toBeVisible();

  await page.goto("/buscar?q=zambos%20picantes");
  await page
    .locator("article")
    .filter({ hasText: "La Canasta Móvil" })
    .getByRole("link", { name: "Zambos picantes" })
    .click();
  const secondAdd = page.getByRole("button", { name: "Agregar al carrito" });
  await secondAdd.click();
  await expect(page.getByRole("button", { name: "En el carrito" })).toBeVisible();

  await page.goto("/oferta/pan-por-encargo-canasta");
  await page.getByLabel("Cantidad").fill("3");
  await page.getByLabel("Inicio que necesitás").fill("2030-01-10T15:00");
  await page.getByLabel("Fin que necesitás").fill("2030-01-10T16:00");
  await page.getByLabel("Variante o detalle (opcional)").fill("sin azúcar");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();

  await page.goto("/oferta/armado-canastas-evento");
  await page.getByLabel("Qué necesitás").fill("Canastas para veinte personas");
  await page
    .getByLabel("Preferencia de cita (opcional)")
    .fill("viernes por la tarde");
  await page.getByLabel("Zona aproximada (opcional)").fill("barrio El Carmen");
  await page.getByRole("button", { name: "Agregar al carrito" }).click();

  await page.getByRole("link", { name: "Carrito (4)" }).click();
  await expect(page).toHaveURL(/\/carrito$/);
  await expect(page.getByRole("heading", { name: "Pulpería El Pino" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "La Canasta Móvil" })).toHaveCount(1);
  await expect(page.getByText("sin azúcar", { exact: false })).toBeVisible();
  await expect(page.getByText("viernes por la tarde", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Ingresar para armar los pedidos" }).click();
  await page.getByLabel("Correo", { exact: true }).fill("comprador@local.test");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("pulperia-local");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByRole("heading", { name: "Carrito" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pulpería El Pino" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "La Canasta Móvil" })).toBeVisible();

  await page.getByRole("button", { name: "Armar pedidos para WhatsApp" }).click();
  await expect(page.getByRole("heading", { name: "Pedidos por vendedor" })).toBeVisible();
  const requestUrl = page.url();

  const pinoWa = page.getByRole("link", { name: "Abrir WhatsApp de Pulpería El Pino" });
  const canastaWa = page.getByRole("link", {
    name: "Abrir WhatsApp de La Canasta Móvil",
  });
  await expect(pinoWa).toBeVisible();
  await expect(canastaWa).toBeVisible();
  await expect(pinoWa).toHaveAttribute("href", /https:\/\/wa\.me\/50499991111/);
  await expect(canastaWa).toHaveAttribute("href", /https:\/\/wa\.me\/50499992222/);

  const canastaRequest = page.locator("section").filter({ hasText: "La Canasta Móvil" });
  await expect(canastaRequest.getByText("Pan por encargo")).toBeVisible();
  await expect(canastaRequest.getByText("Armado de canastas para evento")).toBeVisible();
  const referenceText = await canastaRequest
    .getByText(/^Referencia [0-9a-f]{8}$/)
    .textContent();
  expect(referenceText).not.toBeNull();

  await expect(page.getByText("Pedido preparado").first()).toBeVisible();
  await expect(page.getByText("no significa que el pedido fue enviado", { exact: false })).toBeVisible();

  const popupPromise = page.waitForEvent("popup");
  await canastaWa.click();
  const popup = await popupPromise;
  expect(popup.url()).toMatch(/50499992222/);
  const handoffText = new URL(popup.url()).searchParams.get("text") ?? "";
  expect(handoffText).toContain("Encargo:");
  expect(handoffText).toContain("Servicio:");
  expect(handoffText).toContain("viernes por la tarde");
  expect(handoffText).toContain("se confirman directamente con el vendedor");
  await popup.close();
  await expect(async () => {
    await page.reload();
    await expect(canastaRequest.getByText("WhatsApp abierto")).toBeVisible();
  }).toPass();
  await expect(
    page
      .locator("section")
      .filter({ hasText: "Pulpería El Pino" })
      .getByText("Pedido preparado"),
  ).toBeVisible();

  const sellerContext = await browser.newContext();
  const sellerPage = await sellerContext.newPage();
  await sellerPage.goto(
    `${new URL(requestUrl).origin}/ingresar?next=/mi-pulperia/solicitudes`,
  );
  await sellerPage.getByLabel("Correo", { exact: true }).fill("canasta@local.test");
  await sellerPage
    .getByLabel("Contraseña", { exact: true })
    .fill("pulperia-local");
  await sellerPage.getByRole("button", { name: "Ingresar" }).click();

  await expect(
    sellerPage.getByRole("heading", { name: "Solicitudes recibidas" }),
  ).toBeVisible();
  const sellerRequest = sellerPage
    .locator("article")
    .filter({ hasText: referenceText ?? "Referencia ausente" });
  await expect(sellerRequest.getByText("Pan por encargo")).toBeVisible();
  await sellerRequest
    .getByRole("button", { name: "Confirmar que entendí la solicitud" })
    .click();
  await expect(sellerPage.getByRole("status")).toContainText(
    "Confirmación de comprensión registrada",
  );
  await sellerContext.close();

  await page.goto(requestUrl);
  await expect(
    page
      .locator("section")
      .filter({ hasText: "La Canasta Móvil" })
      .getByText("El vendedor confirmó voluntariamente que entendió el pedido."),
  ).toBeVisible();
});
