# Plan 003: Volver atómica y completa la revisión de contexto

> **Instrucciones del ejecutor**: Ejecutá cada paso y gate. No uses sólo un
> timestamp como prueba de igualdad semántica. Preservá el working tree local y
> actualizá `plans/README.md` al finalizar.
>
> **Drift check**: `git diff --stat 9e25ce7..HEAD -- lib app supabase e2e` y
> `git diff --stat -- lib app supabase e2e`. STOP ante divergencia material.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: L
- **Riesgo**: HIGH
- **Depende de**: 001, 002
- **Categoría**: security, bug, migration, tests
- **Planeado en**: commit `9e25ce7`, 2026-08-30
- **Ejecución**: DONE, 2026-08-30

## Por qué importa

La persona debe revisar exactamente el contexto que se usará para preparar el
pedido. Hoy una edición de cobertura, modo de presencia o WhatsApp puede cambiar
el destino después de agregar una oferta sin alterar `offers.confirmed_at`. La
transacción queda consistente internamente, pero no con lo que la persona aceptó.

## Estado actual

- `lib/selection.ts:26-34,78-100` conserva precio, modo, estado y
  `confirmed_at`; no presencia, destino, cobertura, unidad, detalle temporal ni
  cumplimiento completo.
- `supabase/migrations/20260830142431_selection_handoff_v2.sql:85-93` compara
  únicamente `confirmed_at` antes de insertar snapshots.
- La misma migración en `:107-150` usa el WhatsApp y contexto actuales al crear
  la solicitud.
- `supabase/migrations/20260830035050_offer_contract_v2.sql:960-980` puede cambiar
  modo, WhatsApp, cobertura y territorio sin tocar la oferta.
- El documento activo afirma que cualquier cambio material exige revisión
  (`Obra/Current Context.md:101-108`).

## Alcance

**Dentro de alcance**: contrato público de oferta, `SelectionLine`, RPC de
búsqueda/detalle/refresco, `prepare_request_batch`, snapshots, migrations/pgTAP,
pantallas de carrito y tests E2E.

**Fuera de alcance**: firma criptográfica para terceros, URLs compartibles de
carrito, aceptar/pagar/entregar, reescribir pedidos históricos.

## Pasos

### 1. Definir el contexto canónico de preparación

Construir en SQL una representación canónica que incluya al menos: offer id y
clase, precio/modo/unidad, disponibilidad efectiva y detalles, `confirmed_at`,
modos de cumplimiento ordenados, presence id/modo/cobertura/territorio y destino
WhatsApp. No incluir copy ni campos decorativos.

**Verificar**: pgTAP demuestra token/contexto estable con orden de arrays distinto
y distinto cuando cambia cada campo material.

### 2. Exponer y guardar un token opaco

- Hacer que búsqueda, detalle y refresco devuelvan `request_context_token`.
- Guardarlo en `SelectionLine`; storage viejo sin token debe exigir volver a la
  oferta.
- La UI puede seguir mostrando diferencias legibles, pero el token es la
  condición de autorización para preparar.

**Verificar**: unitarias prueban migración segura del storage y bloqueo de línea
sin token.

### 3. Comparar dentro de la transacción

- `prepare_request_batch` recalcula el token bajo la misma transacción y bloquea
  cualquier discrepancia antes de crear batch/requests.
- Crear snapshots desde esas mismas filas bloqueadas; no consultar destino en una
  segunda ventana vulnerable.
- Mantener errores distinguibles `offer_context_changed` y `offer_not_public`.

**Verificar**: pgTAP cambia por separado WhatsApp, cobertura, cumplimiento,
unidad, precio y ventana entre selección/preparación; cada cambio bloquea y no
inserta filas parciales.

### 4. Cerrar UX y carreras

- En carrito, error de contexto vuelve a cargar y señala el campo cambiado.
- E2E simula cambio de vendedor después de agregar y antes de preparar; el CTA no
  crea pedido hasta aceptar contexto nuevo.

**Verificar**: `pnpm gates && pnpm db:reset && pnpm db:test && pnpm test:e2e` pasa.

## Hecho cuando

- [x] Todo campo que cambia destino o significado invalida el contexto anterior.
- [x] El chequeo y los snapshots son atómicos.
- [x] No hay batch parcial al fallar.
- [x] Storage antiguo falla cerrado con salida comprensible.
- [x] Gates completos pasan y README marca `DONE`.

## STOP

- El token depende de serialización JSON no canónica o de orden inestable.
- La solución exige exponer el número de WhatsApp en una ruta pública.
- La transacción no puede bloquear/leer coherentemente oferta y presencia.
- Un gate falla dos veces después de una corrección razonable.

## Mantenimiento

Cada campo nuevo que altere el pedido, cobertura o destino debe agregarse al
contexto canónico y a una prueba de invalidación antes de publicarse.
