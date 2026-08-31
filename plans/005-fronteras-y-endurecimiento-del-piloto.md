# Plan 005: Cerrar fallos de frontera y endurecer el piloto

> **Instrucciones del ejecutor**: Este plan agrupa gates de salida, no features.
> Ejecutá por bloques pequeños, con pruebas de fallo. No publiques ni uses
> credenciales reales. Preservá cambios locales y actualizá el README.
>
> **Drift check**: `git diff --stat 9e25ce7..HEAD -- app lib supabase e2e next.config.ts`
> y el diff no confirmado equivalente. STOP ante divergencia material.

## Estado

- **Prioridad**: P1
- **Esfuerzo**: L
- **Riesgo**: HIGH
- **Depende de**: 001–004
- **Categoría**: security, bug, reliability, tests
- **Planeado en**: commit `9e25ce7`, 2026-08-30
- **Ejecución**: DONE, 2026-08-30

## Por qué importa

Los flujos centrales pasan sus gates, pero las fronteras todavía fallan de forma
engañosa: una página extrema causa 500, el carrito puede cargar para siempre, los
borrados pueden quedar a medias y una pantalla local de auth podría exponerse por
error. Antes de piloto público hay que fallar cerrado, recuperar y decir la verdad.

## Estado actual

- `lib/search.ts:65-68` acepta cualquier entero seguro y `lib/data.ts:21-25`
  calcula un offset que el RPC `integer` no soporta. Se reprodujo HTTP 500 con
  `/buscar?pagina=2147483647`.
- `app/_components/SelectionClient.tsx:51-61,136` no captura rechazo del refresh;
  `live` puede permanecer `null` indefinidamente.
- `next.config.ts:3-10` no define cabeceras ni apaga `poweredByHeader`; una
  respuesta local observada careció de CSP, nosniff, referrer, permissions y
  framing.
- `next.config.ts:5-8` limita Server Actions a 3 MB, mientras `lib/image.ts:3-6`
  declara 5 MB; `sharp` no recibe límite explícito de píxeles.
- `app/seller-actions.ts:200-213` ignora errores de borrado de Storage/DB.
- `app/account-actions.ts:20-35` borra Storage antes de confirmar el borrado DB.
- `app/ingresar/page.tsx:18-67` publica alta y credenciales locales sin gate de
  entorno visible.
- `app/_components/PresenceForm.tsx:166-187` reconoce que probar el enlace no
  verifica control del número.

## Alcance

**Dentro de alcance**: búsqueda/paginación, estados de error del carrito,
`next.config.ts`, procesamiento de imágenes, seller/account deletion, auth local,
verificación/estado de WhatsApp, límites de eventos públicos, tests y docs de
operación local.

**Fuera de alcance**: despliegue, OAuth real sin credenciales/autorización,
proveedor SMS pago, cambios legales, analítica de terceros.

## Pasos

### 1. Acotar entradas y ofrecer recuperación

- Definir `MAX_SEARCH_PAGE` derivado de límite/offset DB; valores mayores deben
  normalizar a página 1 o devolver estado 404/400 coherente, nunca 500.
- Capturar fallo de refresh del carrito, mostrar alerta + reintento y cancelar
  respuestas obsoletas.

**Verificar**: unitarias para 0, negativo, máximo, máximo+1 y 2147483647; E2E
simula rechazo de refresh y recuperación.

### 2. Añadir cabeceras compatibles con el runtime real

- Desactivar `poweredByHeader`.
- Añadir `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y una
  política explícita de framing.
- Construir CSP a partir de recursos realmente usados por Next, Supabase,
  MapLibre/PMTiles y media. Probar dev y build; no copiar una CSP genérica que
  rompa mapas, imágenes o Server Actions.

**Verificar**: test de headers + recorrido runtime sin errores CSP en búsqueda,
mapa, auth, seller y media.

### 3. Alinear y acotar imágenes

- Unificar límite de request e input; validar `File.size` antes de `arrayBuffer()`.
- Leer metadata con límite explícito de píxeles/dimensiones y rechazar formatos o
  frames fuera de presupuesto antes de conversiones repetidas.
- Probar archivo comprimido pequeño con dimensiones enormes y archivo > límite.

**Verificar**: tests de `lib/image.ts`, memoria/tiempo acotados y error legible.

### 4. Hacer borrados idempotentes y observables

- En media, comprobar cada resultado; si Storage falla, conservar DB y mostrar
  reintento. Si DB falla después de Storage, registrar/encolar compensación local
  segura; no fingir éxito.
- Para cuenta, la DB debe ser la autoridad transaccional de cierre. Separar la
  limpieza de objetos en una tarea idempotente/outbox que pueda reintentarse; no
  dejar cuenta viva sin media por borrar Storage primero.
- Cubrir más de 1000 objetos o documentar/paginar el límite real.

**Verificar**: pruebas inyectan fallo en cada fase y demuestran estado recuperable
sin fuga entre dueños.

### 5. Gatear superficies locales y confianza de contacto

- Mostrar signup/credenciales fixture sólo cuando una variable explícita de
  desarrollo local esté activa; producción sin proveedor configurado debe fallar
  cerrada con mensaje operativo, no crear cuentas de prueba.
- Modelar `whatsapp_verification_status` (o equivalente) y exigir control
  verificado antes de publicar/handoff en piloto abierto. Si no existe proveedor
  autorizado, implementar sólo el estado y gate; STOP antes de comprar/usar uno.
- Añadir límites/deduplicación razonables a eventos públicos para que una ráfaga
  no se interprete como demanda; conservar la regla de que métricas no prueban
  venta ni validación.

**Verificar**: tests de entorno local/producción, número no verificado bloqueado,
ownership y rate limit sin guardar PII/query cruda.

### 6. Gates finales

**Verificar**: `pnpm audit --prod --audit-level high`, `pnpm gates`,
`pnpm db:reset`, `pnpm db:test`, `pnpm test:e2e` y `git diff --check` pasan después
del último cambio.

## Hecho cuando

- [x] Entradas extremas y fallos de red nunca producen 500/carga infinita.
- [x] Cabeceras endurecen sin romper mapas, auth, imágenes ni Server Actions.
- [x] Imágenes tienen presupuesto coherente de bytes y píxeles.
- [x] Borrados fallan de forma recuperable e idempotente.
- [x] Fixtures no pueden exponerse por configuración por defecto.
- [x] Un número no controlado no recibe pedidos de un piloto abierto.
- [x] Gates completos pasan y README marca `DONE`.

## STOP

- Hace falta gasto, proveedor externo, credencial real, publicación o despliegue.
- La CSP correcta requiere un origen no documentado.
- La limpieza idempotente exige infraestructura externa no autorizada.
- Un gate falla dos veces después de una corrección razonable.

## Mantenimiento

Revisar CSP, límites y gates de fixtures con cada dependencia/origen nuevo. La
operación debe distinguir siempre preparado, WhatsApp abierto, entendido,
aceptado, pagado y cumplido; nunca derivar los últimos cuatro de telemetría.
