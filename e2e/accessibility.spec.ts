import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/buscar?q=zambos",
  "/oferta/zambos-picantes-el-pino",
  "/pulperia/el-pino",
  "/mapa",
  "/carrito",
  "/ingresar?error=1",
  "/oferta/no-existe",
];

test("public buyer surfaces have no serious or critical axe violations", async ({
  page,
}) => {
  for (const route of routes) {
    await page.goto(route);
    if (route === "/mapa") {
      await expect(page.locator("[data-map-status=ready]")).toBeVisible();
    }
    await expectNoMaterialViolations(page, route);
  }
});

test("authenticated buyer and seller surfaces have no serious or critical axe violations", async ({
  page,
}) => {
  await signIn(page, "comprador@local.test", "/cuenta");
  for (const route of ["/cuenta", "/cuenta/solicitudes"]) {
    await page.goto(route);
    await expectNoMaterialViolations(page, route);
  }

  await page.goto("/");
  if (await page.locator(".nav-menu summary").isVisible()) {
    await page.locator(".nav-menu summary").click();
  }
  await page.getByRole("button", { name: "Salir" }).click();

  await signIn(page, "elpino@local.test", "/mi-pulperia");
  for (const route of ["/mi-pulperia", "/mi-pulperia/solicitudes"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/presence=/);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForLoadState("networkidle");
    await expectNoMaterialViolations(page, route);
  }
});

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  next: string,
) {
  await page.goto(`/ingresar?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("pulperia-local");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(new RegExp(next.replaceAll("/", "\\/")));
}

async function expectNoMaterialViolations(
  page: import("@playwright/test").Page,
  route: string,
) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("main")).toBeVisible();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const material = results.violations.filter(
    ({ impact }) => impact === "serious" || impact === "critical",
  );
  expect(material, `Axe violations at ${route}`).toEqual([]);
}
