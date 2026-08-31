# Plan 002: Hacer efectiva la vigencia temporal y la ventana solicitada

> **Instrucciones del ejecutor**: Ejecutá en orden, preservá cambios locales y
> actualizá `plans/README.md`. No uses el reloj real sin poder fijarlo en pruebas.
>
> **Drift check**: `git diff --stat 9e25ce7..HEAD -- lib app supabase e2e`
> más `git diff --stat -- lib app supabase e2e`. STOP si los fragmentos base no
> coinciden.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: L
- **Riesgo**: HIGH
- **Depende de**: `plans/001-restaurar-unidad-cantidad-y-comparacion.md`
- **Categoría**: bug, migration, tests
- **Planeado en**: commit `9e25ce7`, 2026-08-30
- **Ejecución**: DONE, 2026-08-30

## Por qué importa

Una oferta de comida vencida se publica hoy como disponible y puede entrar al
carrito. Además, la UI promete que la persona indicará una ventana, pero envía
automáticamente toda la ventana del vendedor. Esto contradice el modelo de
producto y produce solicitudes que no expresan intención real.

## Estado actual

- `supabase/migrations/20260830035050_offer_contract_v2.sql:259-289` valida sólo
  forma y orden de fechas; no determina disponibilidad efectiva.
- `supabase/migrations/20260830135910_discovery_by_need_v2.sql:126-142` excluye
  sólo `availability_state = unavailable`.
- `lib/offer-context.ts:85-115` declara la ventana disponible según estado sin
  comparar `ends_at`/`cutoff_at` con el reloj.
- `app/_components/AddToSelection.tsx:97-105,192-200` no ofrece control de tiempo
  y copia `starts_at`/`ends_at` a la solicitud.
- `lib/offer-context.ts:118-139` omite `next_available_at` y omite el modelo
  `schedule` para oferta digital.
- `Obra/Product Model.md:257-264` exige que una ventana vencida no se presente
  como disponible.

## Alcance

**Dentro de alcance**: `lib/offer-context.ts` y tests, `AddToSelection.tsx`, tipos
de catálogo/selección, una migración nueva para búsqueda/preparación, pgTAP y E2E
de búsqueda/detalle/carrito.

**Fuera de alcance**: calendario de reservas, bloqueo de cupo, aceptación del
vendedor, zona horaria distinta de `America/Tegucigalpa`, estilos.

## Pasos

### 1. Definir disponibilidad efectiva

- Para `scheduled_food`, considerar no solicitables ventanas cuyo `ends_at <= now()`
  o cuyo `cutoff_at <= now()`; conservarlas en el perfil si se necesita historial,
  pero no en descubrimiento ni preparación.
- Centralizar la regla en SQL para que búsqueda y `prepare_request_batch` usen la
  misma autoridad. El render TS debe usar una función equivalente con `now`
  inyectable sólo para copy y pruebas.
- Definir límites exactos: igualdad con cutoff/fin ya está cerrada.

**Verificar**: pgTAP con antes, igualdad y después de cutoff/fin; no depender de
fechas fijas que eventualmente venzan.

### 2. Capturar una ventana solicitada real

- Mostrar controles locales de inicio/fin dentro de la ventana publicada.
- Validar cliente y SQL: inicio < fin, ambos dentro de la ventana, inicio antes
  del cutoff aplicable y duración no vacía.
- Si la ventana vence mientras el carrito está abierto, bloquear y explicar.

**Verificar**: unitarias para subventana válida, fuera de rango, invertida,
cutoff exacto y vencimiento durante la preparación.

### 3. Renderizar agenda completa

- Para servicio y digital con modelo `schedule`, mostrar `next_available_at` y
  `schedule_note` cuando existan.
- Para `on_request`, mostrar `requirements`; no mezclar modelos ni inventar
  ausencia.

**Verificar**: `pnpm test -- lib/offer-context.test.ts` cubre las cuatro clases y
los tres modelos pertinentes.

### 4. Verificación integral

**Verificar**: `pnpm gates && pnpm db:reset && pnpm db:test && pnpm test:e2e` pasa;
un E2E móvil prueba que una ventana vencida desaparece y una vigente conserva la
subventana elegida hasta el handoff.

## Hecho cuando

- [x] Descubrimiento y preparación comparten la misma regla temporal.
- [x] Una ventana vencida/cerrada no se anuncia ni se prepara como disponible.
- [x] La solicitud contiene la subventana elegida por la persona.
- [x] Servicio/digital muestran agenda sin perder campos válidos.
- [x] Gates completos pasan y el README marca `DONE`.

## STOP

- La regla exige inventar capacidad o disponibilidad no declarada.
- Se descubre una segunda zona horaria operativa en el piloto actual.
- Cambiar la regla requiere mutar pedidos históricos.
- Un gate falla dos veces después de una corrección razonable.

## Mantenimiento

El tiempo efectivo es contexto operativo, no `status` persistido. Evitar jobs que
reescriban filas sólo para marcar vencimiento; la regla debe seguir siendo
determinista y testeable en consulta/transacción.
