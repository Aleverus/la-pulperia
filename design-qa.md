# Design QA — Corte 7V

## Resultado vigente — sistema completo

- Fuente visual: `../Obra/Referencias visuales/logo-rotulo-hondureno-seleccionado-2026-09-01.png`.
- Comparación conjunta: `evidence/design-qa/7v4-reference-public-seller.png`; reúne el rótulo elegido, portada pública y panel de dueña en el mismo insumo de revisión.
- Superficies observadas con datos locales: portada, búsqueda, tarjetas, carrito multi-vendedor, ingreso, panel de dueña y oferta nueva. Se revisaron 390 y 1440 px; la cabecera y el reflow mínimo conservan la evidencia previa de 320 px.
- Resultado responsive: las superficies observadas conservaron `scrollWidth <= innerWidth`; navegación de compra y modo vendedor permanecen separadas y el menú móvil conserva su control accesible.
- Resultado visual: la misma pareja Alegreya/Fira Sans Condensed, marfil/cobalto/ladrillo, divisores, foco, estados, radios contenidos y activos reales gobierna recorrido público, comprador, vendedor y operación. El verde queda reservado a disponibilidad o publicación positiva.
- Verdad de catálogo: la interfaz conserva media real cuando existe y fallback explícito por clase; no inventa fotos, pines, stock, venta, pago ni entrega.

### Gates del 2 de septiembre de 2026

- base local reconstruida desde migraciones y semilla; 239 pgTAP pasaron;
- lint del esquema `public` sin errores;
- ESLint, tipos y 84 unitarias pasaron;
- build de producción pasó y la auditoría de dependencias de producción no encontró vulnerabilidades conocidas;
- `git diff --check` pasó después del último cambio visual.

La suite de 36 recorridos Playwright no queda verde en este recibo. Dentro del
sandbox, Chromium no pudo abrir por `spawn EPERM`. Fuera del sandbox, una primera
corrida encontró el servidor dev inconsistente porque un build había reutilizado
su `.next` mientras seguía vivo: 4 casos pasaron y 32 entraron al límite global.
Al preparar la repetición limpia, Docker Desktop cerró su motor y dejó bloqueado
su socket interno; sin el Supabase local no se puede atribuir una nueva corrida
al runtime. Este bloqueo de entorno no se convierte en un fallo de producto ni
hereda el verde histórico.

La revisión conjunta de referencia e implementación no deja hallazgos visuales
P0, P1 o P2 en las superficies observadas. La aceptación humana de Ale y el E2E
completo siguen siendo estados separados.

final result: passed

---

## Recibo de fundación — Corte 7V-0

## Resultado vigente — activos, tokens, tipografía y cabecera

- Fuente visual: `../Obra/Referencias visuales/logo-rotulo-hondureno-seleccionado-2026-09-01.png` (1536 × 1024 px).
- Capturas originales: fueron salida temporal y ya no se conservan. Este recibo preserva el viewport, el estado observado y las medidas verificadas, no un enlace a un artefacto inexistente.
- Estado: cabecera pública sin sesión; menú móvil cerrado y abierto. El cuerpo muestra el límite global de error porque Docker/Supabase local no estaba disponible; esa condición no altera la superficie evaluada en 7V-0.
- Comparación: el recibo histórico confrontó el monograma/wordmark de la lámina con su uso real en cabecera. Las exportaciones temporales no se retienen como fuente de verdad.

### Superficies de fidelidad

- **Tipografía:** Alegreya gobierna titulares editoriales y Fira Sans Condensed conserva texto, controles, cifras, precios, `ñ` y tildes. El navegador observó ambas fuentes autoalojadas en el build de producción.
- **Espaciado y composición:** la cabecera no desborda a 320, 390 ni 1440 px. A 320 px el monograma y wordmark ocupan 140 px, las acciones 148 px y el documento conserva `scrollWidth = 320`; a 1440 px reaparece la navegación completa y se oculta el menú móvil.
- **Color y tokens:** marfil `#FBF5E8`, cobalto `#073B65`, ladrillo `#A53A31`, tinta `#172833` y verde `#3F7A36` sustituyen los tokens de pino/maíz. Sus contrastes sobre marfil son 10.61:1, 5.95:1, 13.93:1 y 4.77:1 respectivamente; la inversión marfil/cobalto mide 11.33:1.
- **Activos:** el header usa recortes reproducibles de la fuente elegida, no una fuente aproximada ni un dibujo de CSS. Existen monograma y wordmark a color, una tinta e inversión; `icon.png`, `apple-icon.png` y `opengraph-image.png` salen de la misma lámina.
- **Contenido:** se conserva el nombre `La Pulpería`, la localidad `Siguatepeque`, carrito, navegación de compra y menú de vendedor sin alterar el contrato de producto.

### Historial de comparación de 7V-0

| Iteración | Severidad | Hallazgo | Corrección y evidencia posterior |
| --- | --- | --- | --- |
| 1 | P2 | Los primeros recortes conservaban separadores verticales y velo marfil de la lámina. | Se acotaron los crops y se endureció la máscara de transparencia; la comparación conjunta ya muestra sólo monograma y wordmark. |
| 1 | P2 | La variante una tinta derivada del monograma a color perdía claridad a 24 px. | Se tomó la variante monocroma dibujada en la propia lámina; color, una tinta e inversión conservan `LP`, ventanita y mostrador a 24 px. |
| 2 | P2 | Faltaba evidencia del menú en el breakpoint mínimo. | La captura histórica a 320 px confirmó apertura, foco visible, ancho de 296 px y ausencia de desborde; la exportación temporal ya no se retiene. |

### Interacciones y consola

- El enlace de marca conserva un nombre accesible y vuelve a inicio.
- El carrito y la navegación autenticada/no autenticada conservan sus rutas y texto.
- El menú móvil abre, recibe foco visible, muestra Buscar/Mapa/Ofrecer/Ingresar y cierra mediante el mismo control.
- La consola registró un error React al entrar al límite global de error por `ECONNREFUSED 127.0.0.1:54321`; es el bloqueo local de Supabase ya observado, no un error introducido por la cabecera. Lint, tipos, unitarias y build de producción sí se ejecutaron sobre este diff.

No quedaron diferencias P0, P1 o P2 en el alcance 7V-0. El resultado vigente de
este documento reemplaza su límite para 7V-1–7V-4 sin reescribir el recibo
histórico de la fundación.

final result: passed

---

## Recibo histórico — base visual de Corte 7

Este bloque conserva la verificación fechada de la dirección anterior. No valida
por anticipado el rediseño de Corte 7V. Ale retiró la imagen fuente después de
quedar supersedida; el bloque conserva lo observado, pero la comparación no puede
regenerarse contra el original.

## Alcance y fuente

- Autoridad visual actual y relación con este recibo: `../Obra/DESIGN.md`.
- Fuente seleccionada durante la pasada: imagen móvil de Corte 6, retirada el 2
  de septiembre de 2026.
- Estado comparado: búsqueda de `queso`, dos resultados, una presencia fija y una móvil.
- Viewport de referencia: 390 × 844 CSS px. La captura del navegador mide 375 px de ancho útil porque excluye la barra de desplazamiento.
- Fuente original: 853 × 1844 px; se normalizó a 375 px de ancho útil sin recortar ni deformar.
- Implementación: `evidence/design-qa/implementation-mobile-search-final.jpg` (375 × 1413 px), capturada desde el build local de producción.
- Comparación conjunta: `evidence/design-qa/comparison-full.jpg`.
- Comparaciones enfocadas: `evidence/design-qa/comparison-header-search.jpg` y `evidence/design-qa/comparison-results.jpg`.

## Coincidencia observada

- Se conserva la jerarquía aprobada: cabecera compacta, búsqueda como acción primaria, filtros táctiles, conteo, mapa local, avisos de confianza, resultados comparables y cierre editorial.
- La paleta cálida marfil/maíz/arcilla con verde pino, la tipografía condensada humanista, los bordes finos, radios contenidos, iconografía lineal y sombras suaves responden a la dirección aprobada.
- El mapa muestra sólo ubicaciones fijas confirmadas y mantiene separada la cobertura móvil/remota.
- Las tarjetas sostienen precio, disponibilidad, vigencia, atención, cumplimiento y siguiente paso sin ocultar el contrato actual del producto.

## Historial de iteraciones

| Iteración | Severidad | Hallazgo | Corrección y evidencia |
| --- | --- | --- | --- |
| 1 | P1 | La primera composición no llevaba el mapa dentro de la búsqueda y perdía el eje espacial de la fuente. | Se integró el mapa real filtrado por los resultados visibles, con enlace para ampliarlo y notas de alcance. |
| 1 | P2 | Los filtros y hechos contractuales se recortaban en móvil. | Los filtros pasan a una fila táctil estable y los hechos compactos usan una retícula sin desborde. |
| 2 | P2 | Las tarjetas quedaban demasiado discursivas frente a la densidad aprobada. | Se acortó el resumen visible, se escondió la descripción secundaria en móvil y se dejó un CTA inequívoco. |
| 3 | P2 | La ficha de oferta desplazaba horizontalmente sus cinco hechos y podía ocultar contexto. | La ficha usa una retícula de dos columnas; 390 px quedó sin desborde horizontal. |
| 3 | P2 | Una oferta sin media quedaba sin superficie visual en la ficha. | Se añadió un fallback coherente por clase con iconografía real y texto explícito; nunca simula una foto del negocio. |
| Final | P1 | Axe detectó contraste 4.05:1 en la etiqueta pequeña del fallback de servicio. | Se oscureció el texto a `--danger`; el barrido Axe posterior pasó en móvil y escritorio. |
| Final | P3 | La fuente usa fotos de queso y una textura topográfica sutil; los fixtures actuales no contienen media propia. | Se preserva la verdad del catálogo con fallbacks por clase. Las fotos aparecerán automáticamente cuando el vendedor cargue media real. La textura queda como refinamiento opcional tras aceptación. |
| Cierre | P1 | Reabrir una oferta ya guardada mostraba valores iniciales y podía sobrescribir silenciosamente la solicitud. | El formulario se monta desde la línea persistida; una regresión unitaria y el navegador confirmaron que cantidad y opciones se conservan antes de actualizar. |
| Cierre | P2 | A 320 px el `min-width` global producía desborde; la etiqueta visible de búsqueda no coincidía con su nombre accesible. | Se eliminó el ancho mínimo global y el nombre accesible vuelve a derivarse de la etiqueta visible; reflow y Axe pasan. |
| Cierre | P2 | El menú móvil y los controles de búsqueda podían conservar estado anterior al navegar sólo por query string o historial. | El menú observa ruta y consulta, y el formulario se remonta con el estado canónico. La regresión Playwright pasa en móvil y escritorio. |
| Cierre | P2 | Estados de validación, carga, error, vacío y acciones destructivas no tenían una jerarquía consistente entre comprador y dueña. | Se añadieron feedback accionable, pending states, vacíos guiados, páginas globales y divulgación progresiva; cuenta y operación usan jerarquías propias. |

## Verificación observable

- Búsqueda: dos resultados, mapa `ready`, pin fijo y dos avisos de alcance visibles.
- Navegación: `Ver oferta` abre la ficha correcta.
- Ficha: fallback honesto, cinco hechos completos y 390 px sin desborde.
- Carrito: `Agregar al carrito` cambia a `En el carrito`, actualiza `Carrito (1)` y conserva oferta, vendedor y handoff de ingreso.
- Capturas auxiliares: `evidence/design-qa/implementation-mobile-detail-final.jpg` y `evidence/design-qa/implementation-mobile-cart.jpg`.
- Recorrido autenticado de cierre: cuenta, historial y detalle de comprador; panel, configuración e inbox de dueña; cuatro clases de intención, carrito multi-vendedor y 404. Las capturas viven en `evidence/audit-corte7-2026-08-30/`.
- Gates posteriores al último cambio: base local reconstruida, 231 pruebas pgTAP, lint de esquema, ESLint, tipos, 19 archivos / 77 pruebas Vitest, build, auditoría de producción y 32 recorridos Playwright en móvil/escritorio, incluidos Axe y reflow a 320 px, pasaron. `git diff --check` pasó.

No quedan hallazgos P0, P1 o P2 abiertos. Las diferencias P3 son conscientes, reversibles y no impiden evaluar esta dirección sobre el producto real.

## Estado de evidencia

Este documento conserva recibos visuales fechados. El 31 de agosto la pasada de
realidad de Corte 7R volvió a pasar lint, tipos y 84 pruebas unitarias, pero no
pudo relanzar Playwright porque el entorno bloqueó el navegador con `spawn
EPERM`. Por eso ningún “passed” histórico de este archivo es una aceptación
actual del diff sin integrar. La fuente vigente de Corte 7V permanece enlazada
desde `../Obra/DESIGN.md`; la referencia anterior ya no se conserva.

## Extensión operativa de dueña — 30 de agosto de 2026

- Fuente visual durante la pasada: la imagen móvil de Corte 6 hoy retirada.
- Implementación: el recibo histórico observó panel y formulario autenticados a
  390 px. Sus exportaciones temporales de `test-results/` no se retienen como
  fuente de verdad; este recibo conserva únicamente los checks fechados.
- Viewport y densidad: 390 × 844 CSS px, factor 1; el navegador entrega 375 px útiles en las capturas por la barra de desplazamiento.
- Comparación de una sola entrada: el recibo histórico comparó la fuente
  normalizada a 375 × 844 con el primer viewport del panel. La fuente sólo define
  el sistema visual público; no existe un mockup aprobado del mismo estado
  vendedor, por lo que no se reclama paridad de contenido.
- Regiones revisadas: cabecera, jerarquía tipográfica, chips de estado, tarjetas de atención, CTA y borde/radio/sombra en la comparación conjunta; el formulario completo verifica la lectura de opciones de clase, campos, controles, vista previa y acciones de publicación. No hizo falta un recorte adicional porque esos controles quedan legibles a escala 1:1 en las capturas.

**Hallazgos y resolución**

- [P1 resuelto] El panel de dueña se comportaba como un listado pasivo y mantenía el carrito de compra como acción de cabecera. Ahora abre con prioridades operativas, ordena la oferta desactualizada primero, permite reconfirmarla sin editar y muestra `Comprar` como salida explícita del modo de dueña.
- [P2 resuelto] Crear una oferta no anticipaba la lectura pública y el alta de presencia preseleccionaba una ubicación fija. La creación incluye una vista previa de los hechos que verá quien busca; la presencia comienza sin modo seleccionado y sólo habilita publicar al completar los requisitos reales de su modalidad.
- [P2 resuelto] La bandeja no resumía su estado ni mantenía visible la referencia de solicitud tras la nueva cabecera. Muestra preparación, apertura de WhatsApp y comprensión como señales distintas, y conserva `Referencia` en cada tarjeta.
- No hay P0, P1 o P2 accionables en el runtime revisado. La ausencia de un mockup vendedor equivalente es una limitación conocida de la fuente, no una afirmación de fidelidad píxel a píxel.

**Superficies de fidelidad**

- Tipografía: conserva el contraste entre la voz condensada del título y el texto operativo legible; no hay truncación ni wrapping que esconda acciones a 390 px.
- Ritmo y layout: márgenes, bordes finos, radios contenidos y superficies cálidas siguen la base; las tarjetas de prioridad jerarquizan una sola tarea sin convertirse en un dashboard genérico.
- Color e iconos: marfil, pino, maíz y estados semánticos reutilizan tokens existentes; los iconos son Tabler reales y no arte CSS ni SVG artesanal.
- Activos y contenido: no se inventan fotos ni pins; el preview y la bandeja describen información que la plataforma sí conoce, y mantienen la frontera de WhatsApp.
- Accesibilidad y respuesta: el recibo histórico registró Axe y reflow móvil sin
  desborde. La repetición E2E de 31 de agosto está bloqueada por el navegador del
  entorno, por lo que ese resultado debe repetirse antes de integrar el diff.
- Interacción nueva: el recibo observó que `Reconfirmar` volvió a
  `/mi-pulperia?ok=fresh`, mostró éxito y actualizó vigencia sin cambiar los
  hechos publicados. La captura temporal ya no se conserva.

Final result: passed

## Corte 7R — vitrina pública y trabajo del vendedor — 31 de agosto de 2026

- Superficies observadas: entrada pública `/vender` sin sesión y panel autenticado
  `/mi-pulperia` de La Canasta Móvil.
- Viewports: 320 × 900, 390 × 900 y 1440 × 1000 CSS px; las seis capturas completas
  están en `evidence/corte-7r/public-{320,390,1440}.png` y
  `evidence/corte-7r/seller-{320,390,1440}.png`.
- Fuente de dirección durante esa pasada: la base móvil de Corte 6 descrita en
  el recibo histórico y hoy retirada. Corte 7R conserva sus tokens, tipografía,
  densidad y jerarquía sin reclamar paridad de contenido con un mockup vendedor
  inexistente.
- Entrada pública: explica oferta privada, publicación contextual y frontera de
  WhatsApp antes de pedir autenticación. En escritorio y móvil mantiene una sola
  acción primaria y una salida inequívoca a la vitrina.
- Trabajo del vendedor: abre con tareas exactas de vigencia, cada una con la oferta
  nombrada, mecanismo directo y límite de la señal; `Crear oferta` aparece una sola
  vez fuera de la lista de tareas y `Volver a comprar` conserva la misma cuenta.
- Respuesta e integridad visual: las seis superficies quedaron sin desborde
  horizontal; la captura automatizada no observó respuestas HTTP fallidas, errores
  de página ni overlays del producto. Se ocultó únicamente el indicador inyectado
  por `next dev`, que no forma parte del runtime de producción.
- Cobertura navegada: el E2E verifica además borrador local recuperable a través de
  recarga y alta del negocio, ausencia de cumplimiento preseleccionado, etiquetas
  no sectoriales, navegación compra/oferta y la tarea exacta de vigencia.

No quedan hallazgos visuales P0, P1 o P2 en las superficies y viewports observados.
La aceptación visual de Ale y la verificación en un build de producción siguen
siendo estados separados.

## Ajuste 7R-P — flujo progresivo del vendedor — 2 de septiembre de 2026

- Problema observado: la lógica era condicional, pero alta y edición todavía
  mostraban cuatro bloques seguidos y la primera foto sólo aparecía después de
  crear la oferta.
- Implementación publicada: la primera alta separa oferta y negocio; el formulario
  presenta tipo, datos esenciales, disponibilidad, cumplimiento y revisión como
  tareas navegables; la revisión acepta una primera foto opcional.
- Accesibilidad estructural: progreso con `aria-current`, botones visitados,
  validación antes de avanzar y foco dirigido al panel activo. A 390 px o menos,
  los rótulos permanecen accesibles aunque la fila visual se compacte a números.
- Evidencia técnica posterior al cambio: ESLint, generación de tipos +
  TypeScript, 85 unitarias, build de producción y `git diff --check` pasan.
- Publicación observada: `d0cfd96` está en `origin/main`; Vercel marcó
  `dpl_6VMkBmyyJMj7JiweQnXC97kssFTq` como `READY`. El navegador cargó
  `https://la-pulperia-hn.vercel.app/vender`, mostró la entrada correcta y no
  capturó errores de consola.
- Límite: no se observó el flujo autenticado ni se repitieron Playwright, Axe o
  capturas a 320/390/1440. El `passed` histórico no se aplica a este ajuste y el
  despliegue privado de prueba no es lanzamiento ni aceptación.

Final result: published-private-test; public-entry-browser-verified; authenticated-visual-verification-pending

## Canonización del runtime actual — 2 de septiembre de 2026

- Se volvió a observar el checkout canónico en `/vender` y
  `/ingresar?next=%2Fvender` a 390 × 844 CSS px. La entrada conserva marfil como
  lienzo, cobalto para marca, títulos y acción principal, ladrillo para el
  eyebrow, Alegreya en títulos, Fira Sans Condensed en interfaz, bordes finos,
  radios contenidos y jerarquía móvil sin desborde visible.
- `/vender` mostró el recorrido de tres momentos, la frontera de WhatsApp, una
  sola acción primaria para ingresar y una salida secundaria a la vitrina.
- `/ingresar` conservó el contexto de oferta privada y presentó acceso y cuenta
  de prueba como superficies separadas bajo la misma cabecera.
- Las capturas de esta pasada viven fuera del repositorio, en
  `C:/Users/ozela/.codex/visualizations/2026/09/02/01a06419-3b10-7451-812b-94522f67afbb/la-pulperia-current-design/01-vender-entry-390.png`
  y `02-login-390.png`; son evidencia de observación, no otra fuente de diseño.
- El backend local no estuvo disponible porque Docker Desktop y su engine no
  estaban corriendo. Por eso no se observó la primera alta autenticada ni el
  editor de cinco etapas, y no se repitieron Axe, 320 px o 1440 px. Su contrato
  quedó canonizado en `../Obra/DESIGN.md` desde la implementación publicada,
  pero su aceptación visual continúa pendiente.

Final result: public-mobile-observed; authenticated-visual-verification-pending

## Paquete SR-1 — shell general local — 2 de septiembre de 2026

- Fuente visual de verdad:
  `../Obra/Referencias visuales/logo-rotulo-hondureno-seleccionado-2026-09-01.png`,
  `../Obra/DESIGN.md` y el esqueleto funcional de SR-1 en
  `../Obra/Implementation Plan.md`.
- Implementación: diff local sobre `d427dee`; no existe captura de implementación
  válida para comparación.
- Viewports requeridos: 320, 390 y 1440 CSS px. El navegador integrado sí mostró
  el runtime privado anterior a 1280 × 720 CSS px, pero no pudo alcanzar
  `localhost:3011` para observar este diff ni aplicar una comparación de igual
  estado y viewport.
- Estado intentado: entrada pública sin sesión. El shell SSR de `/`, `/buscar`,
  `/vender` y `/ingresar` respondió 200 y su HTML contiene la nueva navegación y
  el pie, pero el servidor registró `ECONNREFUSED 127.0.0.1:54321` en las rutas
  dependientes de datos porque Docker/Supabase local está caído. Esto no prueba
  el recorrido ni sustituye una observación visual.
- Interacciones primarias: la navegación por pestañas tiene destinos reales,
  estado activo con `aria-current` y pruebas unitarias para visita, apertura de
  pulpería, ingreso y solicitudes. No se observaron clics ni foco en navegador.
- Consola: no se pudo consultar en el runtime local por el mismo bloqueo.

**Superficies de fidelidad**

- Tipografía: conserva Alegreya y Fira Sans Condensed; no comparada visualmente.
- Espaciado y layout: implementa cabecera de tres zonas en escritorio, pestañas
  inferiores en móvil y reflow declarativo; no comparado visualmente.
- Color: reutiliza los tokens canónicos marfil, cobalto, ladrillo y tinta; no
  introduce otro rol cromático.
- Activos: reutiliza los PNG reales del monograma; no hay SVG, emoji, CSS art ni
  media inventada.
- Copy: conserva precio, vigencia, disponibilidad, presencia, cumplimiento y la
  frontera de confirmación externa. No afirma venta, stock ni cobertura.

**Comparación e iteración**

- No hay comparación conjunta fuente/implementación ni regiones enfocadas: falta
  la captura browser-rendered del diff local. Por ello no se emite una lista
  ficticia de P0–P2 ni se hereda el `passed` histórico.
- Gates posteriores al cambio: ESLint, tipos, 88 unitarias, build de producción
  y `git diff --check` pasaron. El runtime local de datos quedó bloqueado.
- Para desbloquear: observar 320, 390 y 1440 px, comprobar pestañas, foco, menú,
  perfil público, publicación, cuenta y zona de trabajo; guardar capturas
  comparables y corregir cualquier P0–P2 antes de integrar.

final result: blocked

## Paquete SR-1 — publicación privada del shell — 2 de septiembre de 2026

- Commits de producto observados: `9ed6623` y corrección móvil `956ff62` en
  `origin/main`.
- Deployment observado: `dpl_8tHi2jJYVqCqCUdpME5dQeMt1Fx4`, target de
  producción de Vercel usado sólo como prueba privada, estado `READY`, alias
  `https://la-pulperia-hn.vercel.app`.
- Gates repetidos después de la corrección: ESLint, route types y TypeScript,
  88 unitarias en 24 archivos, build de producción y `git diff --check`.
- Estado autenticado observado a tamaño de escritorio: la navegación principal
  marcó `Mi pulpería`; el hub mostró Resumen, Publicaciones, Solicitudes y
  Ajustes; la página pública leyó el negocio como perfil y su oferta como
  publicación atribuida.
- Responsive observado en `/buscar`: a 320 × 760 y 390 × 844 la barra de tareas
  quedó fija al borde inferior, `Comprar` activo y sin ancho horizontal extra;
  a 1440 × 900 pasó a navegación estática en el header con el mismo estado
  activo. No hubo errores de consola capturados en esas comprobaciones.
- Iteración durante QA: el primer deployment contenía la barra móvil dentro del
  encabezado porque `backdrop-filter` creaba su bloque contenedor. La corrección
  conserva ese efecto sólo desde 68 rem, donde la navegación ya es estática.
- Límite: no se recorrieron todavía todas las interacciones, estados de foco,
  menús y formularios de cada pestaña; la aceptación visual de Ale permanece
  pendiente y guiará la profundización por superficie.

final result: responsive-shell-published-and-observed; detailed-visual-qa-pending

## Reparación del audit de producto/UI — 2 de septiembre de 2026

- Fuente: audit de producto y UI de la tarea Codex
  `01a064df-6e72-7c70-bbbf-b286c9200161`, ejecutado sobre el runtime publicado.
- Implementación: diff local sobre
  `578f637f6856a73309da227d5ecc4d50668239fe`; no existe commit, push ni
  deployment de esta reparación.
- Alcance corregido: jerarquía de búsqueda, filtros, mapa, tarjetas, carrito,
  navegación global y vendedora, continuidad del formulario, `/vender`, estados
  vacíos, perfil público, pie y copy contractual.
- Límite de datos: el catálogo remoto observado contiene material de prueba que
  no sostiene confianza comercial. No se inventaron negocios, fotos, stock ni
  ofertas para ocultarlo; el reemplazo por oferta real o representativa requiere
  evidencia y autorización separadas.

**Comparación e iteración**

- A 390 px, búsqueda muestra título y resultados antes de filtros y mapa; las
  tarjetas conservan clase, descripción y tres hechos legibles, las cuatro
  pestañas globales caben sin desborde y los vacíos ofrecen recuperación.
- Al avanzar de `Tipo` a `Lo esencial`, el segundo panel empieza a 26 px bajo la
  cabecera fija (`headerBottom=86.39`, `panelTop=112.22`) y recibe foco sin caer
  a mitad del formulario.
- A 1440 px, la búsqueda usa una retícula de dos columnas y el hero deja de
  desplazar la tarea principal. No se observó ancho horizontal extra.
- En `/carrito` a 390 px, las cuatro pestañas caben sin desborde y el pie público
  permanece fuera de la composición (`display:none`).
- El mapa encuadra los pines recibidos y queda detrás de los resultados como
  contexto opcional. La geolocalización se presenta como orden temporal, no como
  requisito de producto.
- Las capturas de esta pasada están en
  `C:/Users/ozela/.codex/visualizations/2026/09/03/01a064ef-308b-71e0-ae59-77794235e35b/visual-audit-repair/`.

**Gates posteriores al último cambio**

- ESLint: passed.
- Route types y TypeScript: passed.
- Vitest: 24 archivos, 89 pruebas, passed.
- Build de producción: passed.
- `git diff --check`: passed.
- Supabase local, pgTAP y Playwright con datos reales: no ejecutados. `pnpm
  db:start` alcanzó Docker, pero `dockerDesktopLinuxEngine` no estaba disponible.

Resultado: implementado local y verificado técnicamente; QA visual focal pasada
en 390/1440; contenido representativo, base, E2E, publicación y aceptación de
Ale pendientes.

final result: local-implemented-technical-passed-focused-visual-passed; real-data-e2e-publication-owner-acceptance-pending

**Publicación y observación remota — 2 de septiembre de 2026**

- La reparación quedó integrada en
  `fbca6b24639a4f2bb91ce5452b11699af5bf8002`, subida a `origin/main` y publicada
  por Vercel en producción como `dpl_DJjGmHYaDhipNvTNBR41LnQmBRux` (`READY`),
  con alias principal `https://la-pulperia-hn.vercel.app`.
- El recorrido remoto observó `/buscar` a 390 y 1440 px, `/carrito`,
  `/mi-pulperia`, `/vender`, el segundo paso de alta y el perfil público. La
  sesión autenticada sólo navegó y avanzó el formulario sin enviarlo: no se
  escribieron ofertas ni datos del negocio.
- Resultados preceden al mapa; filtros y mapa abren; las cuatro pestañas globales
  y las cuatro pestañas de dueña caben; el pie no aparece en superficies
  privadas; el segundo paso empieza bajo la cabecera fija; perfil y búsqueda no
  tienen ancho horizontal extra. No se capturaron errores de consola.
- En la hora del recorrido, Vercel no registró 4xx, 5xx ni clusters de error para
  el deployment. Supabase respondió 200 para búsqueda, catálogo, medios,
  presencias, ofertas, sesión y solicitudes; el proyecto remoto está saludable y
  conserva como última migración `20260902224613 confirm_owned_whatsapp`.
- El E2E local completo no queda verde. Docker Desktop falla antes de exponer el
  motor por el socket local `sailor-ingest.sock`; por eso no se repitieron reset,
  pgTAP ni Playwright con fixtures. El catálogo remoto visible continúa siendo
  material de prueba, y la aceptación de Ale sigue pendiente.
- Evidencia visual remota:
  `C:/Users/ozela/.codex/visualizations/2026/09/03/01a064ef-308b-71e0-ae59-77794235e35b/visual-audit-repair/remote/`.

Resultado: publicado y observado en producción en superficies públicas y
autenticadas; gates locales dependientes de Docker, contenido representativo y
aceptación de Ale pendientes.

final result: production-published-public-authenticated-observed; local-db-pgtap-full-e2e-content-owner-acceptance-pending

**Estado de datos posterior — 2 de septiembre de 2026**

Ale autorizó volver la aplicación publicada a cero para juzgar su experiencia
desde el primer uso. El carrito local se vació; el flujo recuperable de cuenta
eliminó la identidad propietaria, su pulpería, oferta, medio y único objeto de
Storage; una transacción eliminó las dos cuentas restantes y truncó las 15 tablas
de aplicación. La verificación final devolvió cero usuarios, identidades,
sesiones, refresh tokens, objetos y filas de aplicación. Permanecen 24
migraciones, las 15 tablas con RLS, un bucket vacío, Google OAuth, código y
deployment. `/cuenta` redirige a `/ingresar`, `Continuar con Google` está visible
y el carrito no conserva artículos. Esta limpieza habilita la evaluación de Ale;
no constituye todavía su aceptación visual.

final result: production-data-virgin-verified; first-use-owner-acceptance-pending

## SR-1 — rediseño local de `/cuenta` — 3 de septiembre de 2026

- Fuente: observación anotada por Ale sobre `/cuenta` en el runtime privado a
  854 × 910 CSS px y reglas canónicas de `../Obra/DESIGN.md`.
- Implementación: diff local sobre `95f987b`; no existe commit de producto,
  push ni deployment de este rediseño.
- Comparación observada: el arnés local temporal mostró, a 1265 × 712, fondo
  gris frío, tarjeta blanca de perfil, inicial con indicador de edición, nombre
  editable, selector de fotos, tres accesos apilados y eliminación roja al
  fondo. La referencia y el resultado se juzgaron en la misma revisión; el
  arnés se retiró al terminar.
- Comportamiento: la ruta real lee `profiles` y medios propios en paralelo. La
  acción de servidor exige sesión, valida nombre, acepta sólo un medio visible
  bajo RLS de la persona y actualiza únicamente su fila de perfil.
- Límite: el mock local respondió únicamente lo necesario para renderizar el
  arnés; no se guardó un perfil contra Supabase ni se recorrió la ruta autenticada
  con datos reales. El runtime publicado continúa mostrando la versión anterior.
- Gates posteriores al último cambio: ESLint, tipos, 91 pruebas en 25 archivos
  y build de producción pasaron. El primer intento de build quedó bloqueado al
  buscar Alegreya en Google Fonts; la repetición con acceso de red permitido
  compiló y generó las rutas correctamente. `git diff --check` completa el gate
  documental.

final result: local-implemented-technical-passed-focused-visual-observed; real-data-publication-owner-acceptance-pending
