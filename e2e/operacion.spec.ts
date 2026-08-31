import { expect, test } from "@playwright/test";

test("private report becomes only a neutral public note after operator review", async ({
  page,
}, testInfo) => {
  const marker = `${testInfo.project.name}-${crypto.randomUUID().slice(0, 8)}`;
  const rawReport = `Detalle privado ${marker}: la información necesita revisión.`;
  const publicNote = `Información en revisión para la prueba ${marker}.`;
  const buyerEmail = `reporte.${marker}@local.test`;

  await page.goto("/ingresar?next=/oferta/zambos-picantes-el-pino");
  await page.getByLabel("Nombre visible").fill("Comprador de reporte");
  await page.getByLabel("Correo para la cuenta nueva").fill(buyerEmail);
  await page
    .getByLabel("Contraseña para la cuenta nueva")
    .fill("pulperia-local");
  await page.getByRole("button", { name: "Crear cuenta de prueba" }).click();

  await page.getByText("Reportar información").click();
  await page.getByLabel("Qué debería revisar el operador").fill(rawReport);
  await page.getByRole("button", { name: "Enviar reporte" }).click();
  await expect(page.getByRole("status")).toContainText("Reporte recibido");
  await expect(page.getByText(rawReport)).toHaveCount(0);

  const signOut = page.getByRole("button", { name: "Salir" });
  if (!(await signOut.isVisible())) {
    await page.locator(".nav-menu > summary").click();
  }
  await signOut.click();
  await page.goto("/ingresar?next=/operacion/reportes");
  await page.getByLabel("Correo", { exact: true }).fill("operador@local.test");
  await page.getByLabel("Contraseña", { exact: true }).fill("pulperia-local");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByRole("heading", { name: "Operación" })).toBeVisible();
  const report = page.locator("article").filter({ hasText: rawReport });
  await expect(report).toBeVisible();
  await report.getByLabel(/Nota pública neutral/).fill(publicNote);
  await report.getByRole("button", { name: "Publicar nota" }).click();
  await expect(page.getByRole("status")).toContainText("Revisión guardada");

  await page.goto("/oferta/zambos-picantes-el-pino");
  await expect(page.getByText(publicNote)).toBeVisible();
  await expect(page.getByText(rawReport)).toHaveCount(0);
});
