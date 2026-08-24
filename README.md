# La Pulpería

La Pulpería makes the local supply of Siguatepeque, Honduras easier to see.

A buyer can search for a specific product, compare visible price and freshness,
distinguish physical stores from virtual sellers, build a request across several
sellers, and continue through one structured WhatsApp handoff per seller.

The product is deliberately a **marketplace-vitrine**, not a premature commerce
platform. Sellers retain control of their offers, payment terms, fulfillment,
and customer conversation. La Pulpería does not claim guaranteed stock,
completed sales, delivery coordination, escrow, or platform-owned inventory.

## The local problem

Local commerce is distributed across individual WhatsApp conversations, word of
mouth, scattered business pages, and incomplete search results. A person looking
for something specific may not know who carries it, what it costs, whether the
offer is current, or which option is nearby.

La Pulpería tests a narrower idea: make local offers legible before asking buyers
and sellers to change how they close a purchase.

```text
public search → comparison → multi-seller cart → buyer sign-in
              → one structured WhatsApp handoff per seller
```

## What exists today

The local software integrates:

- public catalog search, filtering, typo tolerance, freshness, and price context;
- physical and virtual seller profiles;
- seller-owned offers and self-service management;
- a Siguatepeque map for physical sellers only;
- a multi-seller cart decomposed into one request per seller;
- buyer accounts, request history, reports, and human-reviewed public context;
- the **Mostrador** visual direction across mobile and desktop surfaces.

This is verified software, not a deployed-market claim. A real provider setup,
public deployment, seller onboarding, field pilot, and evidence of local adoption
remain outside the demonstrated boundary.

## Evidence at the public cut

On 2026-08-23, the current tree passed:

- lint, TypeScript, and production build;
- 43 deterministic unit tests;
- 76 pgTAP database, constraint, and RLS tests;
- 18 Playwright journeys across 390 px mobile and 1440 px desktop viewports.

The browser suite covers public discovery, accessibility, the buyer handoff loop,
seller self-service, map boundaries, account deletion, report review, and safe
indexable metadata. These checks do not prove commercial demand or field use.

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
| Physical seller | `elpino@local.test` | `pulperia-local` |
| Virtual seller | `canasta@local.test` | `pulperia-local` |
| Local operator | `operador@local.test` | `pulperia-local` |

These identities are local fixtures only. They do not promote or represent any
real account.

## Verification

```bash
pnpm gates      # lint, types, unit tests, build
pnpm db:test    # pgTAP database and RLS contract
pnpm test:e2e   # Playwright, mobile and desktop
```

`pnpm map:refresh` extracts the reproducible regional PMTiles package from the
configured public source. The generated binary remains outside Git.

Real Google OAuth, hosting, a domain, provider credentials, external messages,
and spending remain intentionally unconfigured.

## Source status

La Pulpería is an independent project by Alejandro, published through
[`Aleverus`](https://github.com/Aleverus) for inspection and evaluation. No
open-source license is granted unless a file states otherwise.
