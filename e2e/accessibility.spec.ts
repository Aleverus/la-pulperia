import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/buscar?q=zambos",
  "/oferta/zambos-picantes-el-pino",
  "/pulperia/el-pino",
  "/mapa",
  "/carrito",
];

test("public buyer surfaces have no serious or critical axe violations", async ({
  page,
}) => {
  for (const route of routes) {
    await page.goto(route);
    if (route === "/mapa") {
      await expect(page.locator("[data-map-status=ready]")).toBeVisible();
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const material = results.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    );
    expect(material, `Axe violations at ${route}`).toEqual([]);
  }
});
