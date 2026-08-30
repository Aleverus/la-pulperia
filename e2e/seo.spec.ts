import { expect, test } from "@playwright/test";

test("public offer and fixed-location seller expose safe indexable metadata", async ({
  page,
  request,
}) => {
  await page.goto("/oferta/zambos-picantes-el-pino");
  await expect(page).toHaveTitle(/Zambos picantes \| La Pulpería/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3001/oferta/zambos-picantes-el-pino",
  );

  const offerJson = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}",
  );
  expect(offerJson["@type"]).toBe("Product");
  expect(offerJson.offers.priceCurrency).toBe("HNL");
  expect(JSON.stringify(offerJson)).not.toContain("+504");

  await page.goto("/pulperia/el-pino");
  const sellerJson = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}",
  );
  expect(sellerJson["@type"]).toBe("LocalBusiness");
  expect(sellerJson.address.addressLocality).toBe("Siguatepeque");
  expect(JSON.stringify(sellerJson)).not.toContain("whatsapp");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(
    "/oferta/zambos-picantes-el-pino",
  );

  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain("Disallow: /cuenta/");
});
