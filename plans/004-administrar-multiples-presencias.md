# Plan 004: Soportar todas las presencias que puede poseer un vendedor

> **Instrucciones del ejecutor**: Implementá selector/ruteo explícito; no ocultes
> filas ni borres el soporte de múltiples presencias. Preservá cambios locales y
> actualizá el README.
>
> **Drift check**: `git diff --stat 9e25ce7..HEAD -- app lib supabase e2e` y
> `git diff --stat -- app lib supabase e2e`. STOP si cambió el contrato descrito.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: M
- **Riesgo**: MED
- **Depende de**: 003
- **Categoría**: bug, direction, tests
- **Planeado en**: commit `9e25ce7`, 2026-08-30
- **Ejecución**: DONE, 2026-08-30

## Por qué importa

La base permite que una cuenta posea varias presencias y el fixture lo usa, pero
la aplicación selecciona silenciosamente la primera. La segunda presencia y sus
ofertas quedan inaccesibles para mantenimiento. El fallo no debe resolverse
borrando capacidad válida del dominio ni dependiendo del orden de creación.

## Estado actual

- `lib/seller-data.ts:40-47` convierte el array de `get_my_presences()` en
  `data[0]`.
- `supabase/migrations/20260830035050_offer_contract_v2.sql:947-980` permite crear
  nuevas presencias y `:985-1015` devuelve todas.
- `supabase/seed.sql:175-203` asigna “La Canasta Móvil” y “Diseño Remoto
  Siguatepeque” a la misma dueña.
- `/mi-pulperia` y `/vender` parten de la suposición de una sola presencia.

## Alcance

**Dentro de alcance**: `lib/seller-data.ts`, `app/mi-pulperia/**`, `app/vender/**`,
seller actions/forms, navegación, autorización por ownership y E2E seller.

**Fuera de alcance**: equipos con múltiples usuarios, roles por presencia,
franquicias, facturación o fusión de cuentas.

## Pasos

### 1. Devolver la colección completa

Crear `getOwnedPresences()` tipado; eliminar cualquier elección implícita por
índice. Las funciones que reciben `presenceId` deben comprobar ownership y no
deben caer a la primera fila.

**Verificar**: unitarias/DB prueban 0, 1 y 2 presencias, orden estable y acceso
denegado a una presencia ajena.

### 2. Hacer explícita la presencia activa

- Añadir selector accesible en mantenimiento cuando haya más de una.
- Usar una ruta o parámetro canónico persistente y validado; un id inválido debe
  redirigir a una presencia propia válida sin filtrar datos.
- Todas las listas, creación/edición de oferta y solicitudes del vendedor deben
  operar sobre la presencia activa.

**Verificar**: E2E entra con la dueña fixture, alterna móvil/remota y ve ofertas
distintas sin mezclar solicitudes.

### 3. Permitir creación y salida vacía coherentes

- `/vender` no debe bloquear creación sólo porque ya existe una presencia.
- Estado cero ofrece crear; estado uno entra directo; estado múltiple conserva
  selector.
- Mantener una confirmación clara antes de publicar ubicación o WhatsApp.

**Verificar**: E2E cubre creación draft de segunda presencia y retorno a la
primera.

### 4. Gates

**Verificar**: `pnpm gates && pnpm db:reset && pnpm db:test && pnpm test:e2e` pasa.

## Hecho cuando

- [x] Ninguna lectura seller usa `data[0]` para decidir ownership/contexto.
- [x] Las dos presencias del fixture son administrables desde móvil.
- [x] Oferta/solicitud nunca se cruza entre presencias.
- [x] Gates completos pasan y README marca `DONE`.

## STOP

- Aparece un requisito de equipo/roles no descrito.
- El selector requeriría poner ids ajenos en datos públicos.
- Una acción no puede probar ownership en servidor.
- Un gate falla dos veces después de una corrección razonable.

## Mantenimiento

La unidad de autorización seller es la presencia, no “la primera presencia de la
cuenta”. Todo futuro deep link de mantenimiento debe incluir y verificar ese
contexto.
