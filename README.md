# La Pulpería — Código

## Alcance

Este checkout implementa el índice local de comercio y una cuenta única que concentra perfil y ajustes sin separar identidades de compra y venta. La definición de producto, la dirección visual y el estado activo no viven aquí: se consultan en `../Obra/`. No convertir esta aplicación en procesador de pagos, autoridad de inventario, delivery, chat propio ni registro de ventas.

## Autoridades antes de cambiar

1. [`../AGENTS.md`](../AGENTS.md)
2. [`../Obra/Current Context.md`](../Obra/Current%20Context.md)
3. [`../Obra/Implementation Plan.md`](../Obra/Implementation%20Plan.md)
4. [`../Obra/Implementation Contract.md`](../Obra/Implementation%20Contract.md)
5. [`../Obra/DESIGN.md`](../Obra/DESIGN.md) si cambia una superficie visual

`AGENTS.md` dentro de este checkout fija además el protocolo técnico para Next.js y los límites de runtime privado.

## Requisitos y arranque local

- Node `>=22`
- pnpm `11`
- Docker Desktop con motor Linux disponible para Supabase local, pgTAP y recorridos que dependen de fixtures

```bash
pnpm install
pnpm db:start
pnpm db:env
pnpm db:reset
pnpm dev
```

La aplicación local sirve en `http://127.0.0.1:3001`. `.env.local` es una zona de secretos: la persona responsable la prepara desde `.env.example`; ningún agente debe mostrar, copiar, imprimir ni pasar sus valores por argumentos de línea de comandos.

## Checks proporcionales

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm gates       # lint + tipos + unitarias + build
pnpm db:test     # contrato pgTAP/RLS; requiere Docker/Supabase local
pnpm test:e2e    # Playwright; requiere runtime y fixtures funcionales
```

Si Docker o el navegador bloquean un gate, se registra como bloqueo de entorno. Un resultado histórico no se hereda para declarar verde un diff nuevo.

## Datos y artefactos

| Ruta | Clase | Regla |
| --- | --- | --- |
| `public/maps/` | artefacto runtime versionado | conservar; regenerar sólo con `pnpm map:refresh` |
| `pilot/` | protocolo e instrumentos reproducibles | conservar; evidencia real queda bajo rutas ignoradas y sin PII |
| `evidence/` | recibos visuales citados | conservar sólo los archivos referenciados por `design-qa.md` |
| `.env.local`, `.vercel/` | configuración protegida | nunca exponer, copiar ni retirar como limpieza ordinaria |
| `node_modules/`, `.next/`, `test-results/`, `*.tsbuildinfo`, `.codex-work/` | dependencias, builds o salida temporal | regenerables; retirar sólo después de comprobar referencias, procesos y secretos |

## Efectos externos

Una modificación técnica puede cerrarse localmente con checks proporcionales y un commit. Push a `origin/main`, deploy, observación de runtime remoto, contacto, gasto o cambio de credenciales requieren autorización explícita de Ale en la instrucción actual.
