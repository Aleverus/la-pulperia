import { expect, test } from "@playwright/test";

test("a disposable user can delete their account", async ({ page }) => {
  const email = `borrame.${crypto.randomUUID().slice(0, 8)}@local.test`;

  await page.goto("/ingresar?next=/cuenta");
  await page.getByLabel("Nombre visible").fill("Cuenta descartable");
  await page.getByLabel("Correo para la cuenta nueva").fill(email);
  await page.getByLabel("Contraseña para la cuenta nueva").fill("pulperia-local");
  await page.getByRole("button", { name: "Crear cuenta de prueba" }).click();

  await expect(page.getByRole("heading", { name: "Cuenta" })).toBeVisible();
  await page.getByRole("link", { name: /Pedidos para WhatsApp/ }).click();
  await expect(
    page.getByRole("heading", { name: "Pedidos para WhatsApp" }),
  ).toBeVisible();
  await expect(
    page.getByText("Todavía no armaste pedidos para WhatsApp"),
  ).toBeVisible();

  await page.goto("/cuenta");
  await page.getByRole("link", { name: /Localidad/ }).click();
  await expect(
    page.getByRole("heading", { name: "Localidad", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Recordar Siguatepeque" }).click();
  await expect(page.getByRole("status")).toContainText("Preferencia actualizada");
  await expect(
    page.getByRole("main").getByText("Siguatepeque", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Olvidar localidad" }).click();
  await expect(page.getByText("No hay localidad guardada")).toBeVisible();

  await page.goto("/cuenta");
  await page.getByLabel("Escribí BORRAR para confirmar").fill("borrar");
  await page.getByRole("button", { name: /Eliminar mi cuenta/ }).click();
  await expect(page.locator("main [role=alert]")).toContainText(
    "La confirmación debe decir BORRAR",
  );

  await page.getByLabel("Escribí BORRAR para confirmar").fill("BORRAR");
  await page.getByRole("button", { name: /Eliminar mi cuenta/ }).click();
  await expect(page).toHaveURL(/\/?cuenta=borrada$/);
  const signIn = page.getByRole("link", { name: "Ingresar" });
  if (!(await signIn.isVisible())) {
    await page.locator(".nav-menu > summary").click();
  }
  await expect(signIn).toBeVisible();

  await page.goto("/ingresar?next=/cuenta");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("pulperia-local");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/error=1/);
});
