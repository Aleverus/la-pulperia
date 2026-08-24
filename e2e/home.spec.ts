import { expect, test } from "@playwright/test";

test("home is the public catalog", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Encontrá lo que hay cerca/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Qué buscás")).toBeVisible();
});
