import { expect, test } from "@playwright/test";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWO4Y6Nxx0aDAUIBACXeBQEgOSe0AAAAAElFTkSuQmCC",
  "base64",
);

test("seller saves an unverified presence and manages a stock offer privately", async ({
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
  await page.getByRole("radio", { name: /Ubicación fija/ }).check();
  await page
    .getByRole("region", { name: "Pin del negocio" })
    .click({ position: { x: 160, y: 140 } });
  await page.getByLabel(/Confirmo que esta coordenada exacta será pública/).check();
  await expect(page.getByRole("link", { name: "Probar número" })).toHaveAttribute(
    "href",
    /https:\/\/wa\.me\/50499993333/,
  );
  await expect(page.getByRole("status")).toContainText("sin verificar");
  await expect(
    page.getByRole("button", { name: "Publicar pulpería" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Guardar borrador" }).click();

  await expect(page.getByRole("heading", { name: "Mi pulpería" })).toBeVisible();
  await page.getByRole("link", { name: "Crear oferta" }).click();
  await page.getByLabel("Título").fill(offerTitle);
  await page.getByLabel("Precio publicado (lempiras)").fill("45");
  await page.getByLabel("Unidad o periodo").fill("bolsa");
  await page.getByRole("button", { name: "Guardar borrador" }).click();

  await expect(page.getByRole("heading", { name: "Editar oferta" })).toBeVisible();
  for (const [index, name] of ["primera.png", "segunda.png"].entries()) {
    await page.getByLabel(/Foto \(opcional/).setInputFiles({
      name,
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.locator('img[alt="Foto de la oferta"]')).toHaveCount(
      index + 1,
    );
  }
  await page.getByRole("button", { name: "Quitar foto" }).first().click();
  await expect(page.locator('img[alt="Foto de la oferta"]')).toHaveCount(1);
  await page.getByLabel(/Foto \(opcional/).setInputFiles({
    name: "reemplazo.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.locator('img[alt="Foto de la oferta"]')).toHaveCount(2);

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
  await expect(page.getByRole("link", { name: offerTitle })).toHaveCount(0);

  await page.goto("/mapa");
  const list = page.getByRole("list", { name: "Ubicaciones fijas" });
  await expect(list.getByText("Pulpería El Pino")).toBeVisible();
  await expect(list.getByText(presenceName)).toHaveCount(0);
  await expect(list.getByText("La Canasta Móvil")).toHaveCount(0);

  const secondPresenceName = `Repartos La Esquina ${suffix}`;
  await page.goto("/vender");
  await expect(
    page.getByRole("heading", { name: "Abrir otra pulpería" }),
  ).toBeVisible();
  await page.getByLabel("Nombre de la pulpería").fill(secondPresenceName);
  await page.getByLabel("WhatsApp", { exact: true }).fill("99994445");
  await page.getByRole("radio", { name: /Atención móvil/ }).check();
  await page
    .getByRole("textbox", { name: "Cobertura declarada" })
    .fill("Siguatepeque urbano");
  await page.getByRole("button", { name: "Guardar borrador" }).click();

  await expect(page.getByLabel("Nombre de la pulpería")).toHaveValue(
    secondPresenceName,
  );
  await page.getByLabel("Pulpería activa").selectOption({ label: presenceName });
  await page.getByRole("button", { name: "Cambiar" }).click();
  await expect(page.getByLabel("Nombre de la pulpería")).toHaveValue(
    presenceName,
  );
});

test("fixture owner switches mobile and remote presences without mixing offers", async ({
  page,
}) => {
  await page.goto("/ingresar?next=/mi-pulperia");
  await page.getByLabel("Correo", { exact: true }).fill("canasta@local.test");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("pulperia-local");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page.getByLabel("Nombre de la pulpería")).toHaveValue(
    "La Canasta Móvil",
  );
  await expect(page.getByRole("link", { name: "Pan por encargo" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Tarjeta digital para evento" }),
  ).toHaveCount(0);

  await page
    .getByLabel("Pulpería activa")
    .selectOption({ label: "Diseño Remoto Siguatepeque" });
  await page.getByRole("button", { name: "Cambiar" }).click();

  await expect(page.getByLabel("Nombre de la pulpería")).toHaveValue(
    "Diseño Remoto Siguatepeque",
  );
  await expect(
    page.getByRole("link", { name: "Tarjeta digital para evento" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Pan por encargo" })).toHaveCount(0);

  await page.goto(
    "/mi-pulperia?presence=10000000-0000-0000-0000-999999999999",
  );
  await expect(page.getByLabel("Nombre de la pulpería")).toHaveValue(
    "La Canasta Móvil",
  );
  await expect(page.getByText("Pulpería El Pino")).toHaveCount(0);
});

test("seller maintains food, service, and digital offers through the class-aware flow", async ({
  page,
}) => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const email = `movil.${suffix}@local.test`;
  const foodTitle = `Pan de tarde ${suffix}`;
  const serviceTitle = `Reparación local ${suffix}`;
  const editedServiceTitle = `${serviceTitle} actualizada`;
  const digitalTitle = `Diseño digital ${suffix}`;

  await page.goto("/ingresar?next=/vender");
  await page.getByLabel("Nombre visible").fill("Vendedora móvil");
  await page.getByLabel("Correo para la cuenta nueva").fill(email);
  await page.getByLabel("Contraseña para la cuenta nueva").fill("pulperia-local");
  await page.getByRole("button", { name: "Crear cuenta de prueba" }).click();

  await page.getByLabel("Nombre de la pulpería").fill(`Negocio móvil ${suffix}`);
  await page.getByLabel("WhatsApp", { exact: true }).fill("99994444");
  await page.getByRole("radio", { name: /Atención móvil/ }).check();
  await page
    .getByRole("textbox", { name: "Cobertura declarada" })
    .fill("Siguatepeque urbano");
  await expect(
    page.getByRole("button", { name: "Publicar pulpería" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Guardar borrador" }).click();

  await page.getByRole("link", { name: "Crear oferta" }).click();
  await expect(page.getByLabel("Nota de existencias (opcional)")).toBeVisible();
  await expect(page.getByLabel("Inicio de la ventana")).toHaveCount(0);
  await page.getByRole("radio", { name: /Comida o encargo/ }).check();
  await expect(page.getByLabel("Nota de existencias (opcional)")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Cita" })).toHaveCount(0);
  await page.getByLabel("Título").fill(foodTitle);
  await page.getByLabel("Precio publicado (lempiras)").fill("18");
  await page.getByLabel("Unidad o periodo").fill("unidad");
  await page.getByLabel("Inicio de la ventana").fill("2030-04-12T14:00");
  await page.getByLabel("Fin de la ventana").fill("2030-04-12T18:00");
  await page.getByLabel("Fecha de corte (opcional)").fill("2030-04-12T12:00");
  await page.getByRole("button", { name: "Crear y publicar" }).click();

  await expect(page.getByRole("heading", { name: "Editar oferta" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar vigencia" }).click();
  await expect(page.getByRole("status")).toContainText("Vigencia confirmada");
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(page.getByRole("button", { name: "Volver a publicar" })).toBeVisible();
  await page.getByRole("button", { name: "Volver a publicar" }).click();

  await page.goto("/mi-pulperia");
  await page.getByRole("link", { name: "Crear oferta" }).click();
  await page.getByRole("radio", { name: /Servicio local/ }).check();
  await expect(page.getByLabel("Nota de existencias (opcional)")).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Retiro" })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Cita" })).toBeVisible();
  await page.getByLabel("Título").fill(serviceTitle);
  await page.getByLabel("Modalidad de precio").selectOption("quote");
  await expect(page.getByLabel("Precio publicado (lempiras)")).toHaveCount(0);
  await page.getByLabel("Nota de agenda").fill("Disponible por la tarde");
  await page.getByRole("checkbox", { name: "Cita" }).check();
  await page.getByRole("button", { name: "Crear y publicar" }).click();

  await expect(page.getByRole("heading", { name: "Editar oferta" })).toBeVisible();
  await page.getByLabel("Título").fill(editedServiceTitle);
  await page.getByLabel("Nota de agenda").fill("Disponible de lunes a viernes");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByLabel("Título")).toHaveValue(editedServiceTitle);

  await page.goto("/mi-pulperia");
  await page.getByRole("link", { name: "Crear oferta" }).click();
  await page.getByRole("radio", { name: /Oferta digital/ }).check();
  await expect(page.getByRole("checkbox", { name: "Entrega digital" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Cobertura o visita local" })).toHaveCount(0);
  await page.getByLabel("Título").fill(digitalTitle);
  await page.getByLabel("Modalidad de precio").selectOption("quote");
  await page.getByLabel("Estado actual").selectOption("on_request");
  await expect(page.getByLabel("Nota de agenda")).toHaveCount(0);
  await page
    .getByLabel("Qué necesitás para responder")
    .fill("Alcance, formato y fecha deseada");
  await page.getByRole("checkbox", { name: "Entrega digital" }).check();
  await page.getByRole("button", { name: "Crear y publicar" }).click();

  await expect(page.getByRole("heading", { name: "Editar oferta" })).toBeVisible();
  await page.goto("/mi-pulperia");
  await expect(page.getByRole("link", { name: foodTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: editedServiceTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: digitalTitle })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
});
