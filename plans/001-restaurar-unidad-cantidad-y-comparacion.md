# Plan 001: Restaurar unidad, cantidad y comparación honesta

> **Instrucciones del ejecutor**: Seguí el plan en orden. Ejecutá cada gate y
> confirmá su resultado antes de continuar. Preservá todo cambio local existente.
> Si ocurre una condición de STOP, reportá y no improvises. Al terminar, actualizá
> `plans/README.md`.
>
> **Drift check**: `git diff --stat 9e25ce7..HEAD -- app lib supabase e2e`
> y `git diff --stat -- app lib supabase e2e`. Este plan fue escrito sobre un
> working tree con cambios no confirmados; si los fragmentos descritos ya no
> coinciden, STOP.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: L
- **Riesgo**: HIGH
- **Depende de**: none
- **Categoría**: bug, migration, tests, direction
- **Planeado en**: commit `9e25ce7`, 2026-08-30
- **Ejecución**: DONE, 2026-08-30

## Por qué importa

La propuesta central exige comparación honesta. Hoy `L 80` por libra y `L 75`
por otra unidad pueden ordenarse como cifras equivalentes, y la unidad desaparece
del carrito y del WhatsApp. Esto hace ambiguo el pedido y puede inducir una compra
equivocada aunque la base conserve la unidad correcta.

## Estado actual

- `app/_components/OfferList.tsx:57-60` y
  `app/oferta/[slug]/page.tsx:129-148` muestran precio y preparan selección sin
  pasar `unit`.
- `lib/selection.ts:26-34,107-125` no guarda unidad y usa “unidad(es)” fija.
- `lib/handoff.ts:12-19,43-59` no recibe ni imprime unidad.
- `app/cuenta/solicitudes/[id]/page.tsx:82-89,110-120` descarta `item.unit`.
- `app/_components/AddToSelection.tsx:74-85,184-200` impone entero >= 1.
- `supabase/migrations/20260830135910_discovery_by_need_v2.sql:166-175`
  ordena sólo `rprice` para `price_asc`/`price_desc`.
- `supabase/migrations/20260830142431_selection_handoff_v2.sql:119-150`
  ya conserva `unit_snapshot`; no borrar ni duplicar esa fuente de verdad.
- Caso reproducible: `supabase/seed.sql:228-239`, “Queso seco”, `from`, unidad
  `libra`; el flujo móvil lo mostró como “1 unidad”.

## Comandos

| Propósito | Comando | Éxito esperado |
|---|---|---|
| Base limpia local | `pnpm db:reset` | exit 0 |
| DB | `pnpm db:test` | todas las pgTAP pasan |
| Unitarias/build | `pnpm gates` | exit 0; 50+ tests y build verde |
| E2E | `pnpm test:e2e` | todos pasan |
| Diff | `git diff --check` | sin errores |

## Alcance

**Dentro de alcance**:

- `lib/catalog.ts`, `lib/selection.ts`, `lib/selection.test.ts`
- `lib/handoff.ts`, `lib/handoff.test.ts`, `lib/money.ts`
- `app/_components/AddToSelection.tsx`, `OfferList.tsx`, `SelectionClient.tsx`
- `app/oferta/[slug]/page.tsx`, `app/cuenta/solicitudes/[id]/page.tsx`
- `app/_components/SearchForm.tsx`, `app/buscar/page.tsx`, `lib/search.ts`
- una migración nueva y las pgTAP correspondientes
- E2E de búsqueda, carrito y handoff

**Fuera de alcance**: pagos, totales, checkout, normalización universal de
catálogo, scraping, estilos visuales.

## Pasos

### 1. Definir el contrato de unidad y cantidad

- Exigir unidad no vacía para producto con stock y comida programada cuando la
  oferta usa cantidad. Mantener `null` permitido para servicio/digital cuando no
  haya unidad comercial honesta.
- Aceptar cantidad decimal positiva con máximo 3 decimales y un máximo explícito
  razonable; no usar `Number.isInteger` ni validación SQL `integer`.
- Serializar cantidad como número JSON sólo después de validar que sea finita y
  esté en rango.

**Verificar**: pruebas unitarias y pgTAP nuevas cubren `0.5 libra`, `1.25 kg`,
0, negativo, NaN, exceso de decimales y máximo.

### 2. Propagar la unidad sin pérdida

- Añadir `unit` a `SelectionLine`, `AddToSelection`, `HandoffItem`, resumen de
  solicitud y mapeo de la pantalla de solicitud.
- Mostrar precio como `L 80.00 / libra` cuando exista unidad; no inventar unidad
  para cotización/servicio.
- Incluir unidad en la detección de cambio y en el mensaje de WhatsApp.
- Mantener compatibilidad con el storage v2 existente: líneas antiguas sin unidad
  deben bloquear preparación y pedir volver a la oferta, no asumir “unidad”.

**Verificar**: `pnpm test -- lib/selection.test.ts lib/handoff.test.ts` pasa con
casos singulares/plurales y sin unidad legítima.

### 3. Retirar el orden engañoso hasta tener comparables estructurados

- Eliminar `price_asc`/`price_desc` de la UI pública y hacer que parámetros viejos
  degraden a `organic`.
- Retirar las ramas SQL de precio en una migración nueva o rechazarlas de forma
  explícita. Conservar reciente, cercanía y orgánico.
- Actualizar copy y pruebas. No reintroducir “más barato” por advertencia textual.

**Verificar**: una búsqueda con `orden=price_asc` no presenta el orden como precio
y `pnpm db:test` prueba el comportamiento estable.

### 4. Cerrar el flujo observable

- E2E móvil: buscar queso, abrir detalle, agregar `0.5 libra`, revisar carrito,
  preparar solicitud y comprobar que pantalla/mensaje contienen `0.5 libra`.
- Probar una oferta de servicio sin unidad y una cotización sin cifra.

**Verificar**: `pnpm gates && pnpm db:test && pnpm test:e2e` exit 0.

## Hecho cuando

- [x] Ninguna superficie convierte una unidad conocida en “unidad”.
- [x] Cantidades fraccionarias válidas sobreviven selección, DB, snapshot y handoff.
- [x] No existe orden público por precio entre ofertas no comparables.
- [x] Gates, pgTAP, E2E y `git diff --check` pasan después del último cambio.
- [x] Sólo archivos dentro del alcance cambiaron y el README marca `DONE`.

## STOP

- El contrato actual de `unit_snapshot` fue removido o cambió de tipo.
- La migración requiere reinterpretar pedidos ya preparados.
- Para mostrar una unidad hace falta inventarla a partir del título.
- Un gate falla dos veces después de una corrección razonable.

## Mantenimiento

Reintroducir orden por precio sólo cuando exista una clave explícita de
comparabilidad: clase, identidad/variante y unidad normalizada; `from` debe seguir
siendo mínimo, no total equivalente.
