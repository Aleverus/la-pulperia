import { expect, test } from "@playwright/test";

test("home is the public catalog", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Encontrá quién ofrece lo que necesitás/ }),
  ).toBeVisible();
  await expect(page.getByLabel("¿Qué necesitás encontrar?")).toBeVisible();
  await expect(page.getByRole("link", { name: "Carrito" })).toHaveAttribute(
    "href",
    "/carrito",
  );
});

test("the former selection URL resolves to the canonical cart", async ({ page }) => {
  await page.goto("/seleccion");
  await expect(page).toHaveURL(/\/carrito$/);
  await expect(page.getByRole("heading", { name: "Carrito" })).toBeVisible();
});
