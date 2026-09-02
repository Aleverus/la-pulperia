# Design QA — base visual de La Pulpería

## Alcance y fuente

- Dirección de experiencia: `../Obra/DESIGN.md`.
- Fuente seleccionada: `../Obra/Referencias visuales/direccion-visual-base-movil-aprobada-2026-08-30.png`.
- Estado comparado: búsqueda de `queso`, dos resultados, una presencia fija y una móvil.
- Viewport de referencia: 390 × 844 CSS px. La captura del navegador mide 375 px de ancho útil porque excluye la barra de desplazamiento.
- Fuente original: 853 × 1844 px; se normalizó a 375 px de ancho útil sin recortar ni deformar.
- Implementación: `.codex-work/design-qa/implementation-mobile-search-final.jpg` (375 × 1413 px), capturada desde el build local de producción.
- Comparación conjunta: `.codex-work/design-qa/comparison-full.jpg`.
- Comparaciones enfocadas: `.codex-work/design-qa/comparison-header-search.jpg` y `.codex-work/design-qa/comparison-results.jpg`.

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
- Capturas auxiliares: `.codex-work/design-qa/implementation-mobile-detail-final.jpg` y `.codex-work/design-qa/implementation-mobile-cart.jpg`.
- Recorrido autenticado de cierre: cuenta, historial y detalle de comprador; panel, configuración e inbox de dueña; cuatro clases de intención, carrito multi-vendedor y 404. Las capturas viven en `.codex-work/audit-corte7-2026-08-30/`.
- Gates posteriores al último cambio: base local reconstruida, 231 pruebas pgTAP, lint de esquema, ESLint, tipos, 19 archivos / 77 pruebas Vitest, build, auditoría de producción y 32 recorridos Playwright en móvil/escritorio, incluidos Axe y reflow a 320 px, pasaron. `git diff --check` pasó.

No quedan hallazgos P0, P1 o P2 abiertos. Las diferencias P3 son conscientes, reversibles y no impiden evaluar esta dirección sobre el producto real.

## Estado de evidencia

Este documento conserva recibos visuales fechados. El 31 de agosto la pasada de
realidad de Corte 7R volvió a pasar lint, tipos y 84 pruebas unitarias, pero no
pudo relanzar Playwright porque el entorno bloqueó el navegador con `spawn
EPERM`. Por eso ningún “passed” histórico de este archivo es una aceptación
actual del diff sin integrar; la fuente visual aprobada en `Obra/` sí es la
referencia que se conserva.

## Extensión operativa de dueña — 30 de agosto de 2026

- Fuente visual: `../Obra/Referencias visuales/direccion-visual-base-movil-aprobada-2026-08-30.png`.
- Implementación: el recibo histórico observó panel y formulario autenticados a
  390 px. Sus exportaciones temporales de `test-results/` no se retienen como
  fuente de verdad; la referencia aprobada y los checks fechados sí.
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
  están en `.codex-work/corte-7r/public-{320,390,1440}.png` y
  `.codex-work/corte-7r/seller-{320,390,1440}.png`.
- Fuente de dirección: la base móvil aprobada de Corte 6 citada al inicio de este
  documento. Corte 7R conserva sus tokens, tipografía, densidad y jerarquía sin
  reclamar paridad de contenido con un mockup vendedor inexistente.
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
