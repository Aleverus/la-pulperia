import { expect, test } from "@playwright/test";

test("home opens the territorial explorer", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/mapa$/);
  await expect(page.getByLabel("¿Qué necesitás cerca?")).toBeVisible();
  await expect(page.getByRole("tab", { name: /Cerca/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
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
