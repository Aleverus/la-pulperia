# La Pulpería

La Pulpería is a living local-commerce index for Siguatepeque, Honduras.

It is intended to answer a concrete question across local businesses: who
offers this, under what listed price or pricing mode, how current the information
is, how the business serves the customer, and what still needs confirmation.
WhatsApp remains the seller-owned conversation and closing channel.

La Pulpería is not a national everything-marketplace, an individual storefront
builder, a delivery operator, a payment processor, an inventory authority, or a
record of completed sales.

## Target product contract

The target v2 domain treats an offer as the unit of value and supports:

- stocked products;
- food or made-to-order windows;
- local services;
- digital products or services;
- fixed, “from”, and quote pricing;
- stock, window/capacity, schedule, and on-request availability;
- fixed-location, mobile-coverage, and remote presences;
- pickup, local coverage, seller shipping, appointment, digital delivery, or
  direct agreement.

The complete loop is:

```text
concrete need
→ public search
→ contextual comparison
→ class-appropriate selection or request
→ buyer authentication
→ one request per seller
→ structured WhatsApp handoff
→ seller-owned confirmation and fulfillment
```

Opening WhatsApp means only `handoff_opened`. It is not a sent message, order,
payment, accepted request, delivery, or sale.

## Current implementation boundary

The local Corte 2 implementation now provides:

- public search, filters, typo tolerance, sorting, and pagination;
- published price and freshness context;
- fixed-location, mobile-coverage, and remote seller presences;
- seller-owned offers and class-aware mobile self-service for creating,
  publishing, correcting, pausing, republishing, and reconfirming offers;
- a Siguatepeque map for confirmed physical locations;
- a class-aware selection split into one request per seller;
- buyer authentication, request history, and WhatsApp handoff;
- reports, human-reviewed public notes, privacy-safe metrics, retention, and
  account deletion;
- Supabase/PostgreSQL/PostGIS migrations, RLS, and automated tests.

The v2 migration, fixtures, views, RPCs, RLS, snapshots, TypeScript consumers,
class-specific request payloads, seller maintenance flow, and anonymous
maintenance-duration samples are implemented and verified locally. Corte 2 is
technically complete; no visual direction is implied or accepted by that result.

## Visual reset

The former **Mostrador** and **Tabula** directions were rejected on 2026-08-29.
Their explorations, global styles, favicon, generated social image, PostCSS, and
Tailwind tooling were removed.

The remaining unstyled semantic markup preserves routes and behavior only. It
is not an accepted design or a user-ready frontend. A new visual direction will
be explored as exactly three alternatives after the v2 contract is stable and
must be selected by Ale before implementation.

## Evidence

After the final Corte 2 changes on 2026-08-30, the local tree passed:

- ESLint;
- generated Next route types and TypeScript;
- 43 deterministic unit tests;
- production build;
- a clean Supabase database reset and deterministic seed;
- 115 pgTAP database, constraint, RPC, and RLS tests;
- Supabase security and performance advisors with no warnings;
- 20 Playwright journeys at 390 px and 1440 px, including no serious or
  critical Axe violations.

This receipt proves the local technical contract and exercised flows. It does
not prove commercial demand, legal readiness, deployment, field use, or visual
acceptance.

## Run locally

Requirements: Node 22+, pnpm 11, Docker Desktop.

```bash
pnpm install
pnpm db:start
pnpm db:env
pnpm db:reset
pnpm map:refresh
pnpm dev
```

Open `http://127.0.0.1:3001`.

Local fixtures:

| Role | Email | Password |
| --- | --- | --- |
| Buyer | `comprador@local.test` | `pulperia-local` |
| Fixed-location seller | `elpino@local.test` | `pulperia-local` |
| Mobile seller | `canasta@local.test` | `pulperia-local` |
| Local operator | `operador@local.test` | `pulperia-local` |

These identities are local fixtures only. They do not represent real accounts.

## Verification

```bash
pnpm gates      # lint, route types, TypeScript, unit tests, build
pnpm db:reset    # rebuild the local database and fixtures
pnpm db:test     # pgTAP domain and RLS contract
pnpm test:e2e   # Playwright mobile and desktop journeys
```

`pnpm map:refresh` extracts the reproducible regional PMTiles package from the
configured public source. The generated binary remains outside Git.

Real Google OAuth, hosting, domain, provider credentials, messages, spending,
seller onboarding, and field research remain intentionally unconfigured.

## Source status

La Pulpería is an independent project by Alejandro, published through
[`Aleverus`](https://github.com/Aleverus) for inspection and evaluation. No
open-source license is granted unless a file states otherwise.
