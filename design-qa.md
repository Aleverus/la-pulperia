# Design QA — base visual de La Pulpería

## Alcance y fuente

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
- Gates posteriores al último cambio: base local reconstruida, 231 pruebas pgTAP, lint de esquema, ESLint, tipos, 18 archivos / 76 pruebas Vitest, build, auditoría de producción y 32 recorridos Playwright en móvil/escritorio, incluidos Axe y reflow a 320 px, pasaron. `git diff --check` pasó.

No quedan hallazgos P0, P1 o P2 abiertos. Las diferencias P3 son conscientes, reversibles y no impiden evaluar esta dirección sobre el producto real.

Final result: passed
