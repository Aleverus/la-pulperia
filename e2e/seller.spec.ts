import { expect, test } from "@playwright/test";

test("seller publishes a physical pulpería and manages an offer", async ({
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const email = `esquina.${suffix}@local.test`;
  const presenceName = `Pulpería La Esquina ${suffix}`;
  const offerTitle = `Café molido ${suffix}`;

  await page.goto("/ingresar?next=/vender");
  await page.getByLabel("Nombre visible").fill("Dueña Esquina");
  await page.getByLabel("Correo para la cuenta nueva").fill(email);
  await page.getByLabel("Contraseña para la cuenta nueva").fill("pulperia-local");
  await page.getByRole("button", { name: "Crear cuenta de prueba" }).click();

  await expect(page.getByRole("heading", { name: "Abrir una pulpería" })).toBeVisible();
  await page.getByLabel("Nombre de la pulpería").fill(presenceName);
  await page.getByLabel("WhatsApp", { exact: true }).fill("99993333");
  await page.getByRole("radio", { name: /Física/ }).check();
  await page
    .getByRole("region", { name: "Pin del negocio" })
    .click({ position: { x: 160, y: 140 } });
  await page.getByLabel(/Confirmo que esta coordenada exacta será pública/).check();
  await expect(page.getByRole("link", { name: "Probar número" })).toHaveAttribute(
    "href",
    /https:\/\/wa\.me\/50499993333/,
  );
  await expect(page.getByText("no verifica")).toBeVisible();
  await page.getByRole("button", { name: "Publicar pulpería" }).click();

  await expect(page.getByRole("heading", { name: "Mi pulpería" })).toBeVisible();
  await page.getByRole("link", { name: "Crear oferta" }).click();
  await page.getByLabel("Título").fill(offerTitle);
  await page.getByLabel("Precio publicado (lempiras)").fill("45");
  await page.getByRole("button", { name: "Crear oferta" }).click();

  await expect(page.getByRole("heading", { name: "Editar oferta" })).toBeVisible();
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.getByRole("button", { name: "Confirmar vigencia" }).click();
  await expect(page.getByText("Vigencia confirmada")).toBeVisible();
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(
    page.getByRole("button", { name: "Volver a publicar" }),
  ).toBeVisible();

  await page.goto("/buscar?q=caf%C3%A9%20molido");
  await expect(page.getByRole("link", { name: offerTitle })).toHaveCount(0);

  await page.goto("/mi-pulperia");
  await page.getByRole("link", { name: offerTitle }).click();
  await page.getByRole("button", { name: "Volver a publicar" }).click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();

  await page.goto("/buscar?q=caf%C3%A9%20molido");
  await expect(page.getByRole("link", { name: offerTitle })).toBeVisible();
  await expect(page.getByText(presenceName)).toBeVisible();

  await page.goto("/mapa");
  const list = page.getByRole("list", { name: "Negocios físicos" });
  await expect(list.getByText("Pulpería El Pino")).toBeVisible();
  await expect(list.getByText(presenceName)).toBeVisible();
  await expect(list.getByText("La Canasta Virtual")).toHaveCount(0);
});
