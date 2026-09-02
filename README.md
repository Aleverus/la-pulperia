# La Pulpería

La Pulpería is a living local-commerce index for Siguatepeque, Honduras.

It is intended to answer a concrete question across local businesses: who
offers this, under what listed price or pricing mode, how current the information
is, how the business serves the customer, and what still needs confirmation.
WhatsApp remains the seller-owned conversation and closing channel.

La Pulpería is not a national everything-marketplace, an individual storefront
builder, a delivery operator, a payment processor, an inventory authority, or a
record of completed sales.

It should still work as a useful local marketplace and commerce hub: people can
search and compare offers, add what they want to a cart, and have La Pulpería
prepare one clear WhatsApp order per seller. More commerce capabilities can be
added gradually without pretending that La Pulpería already owns payment,
inventory, delivery, or the final sale.

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
→ add class-appropriate offers to the cart
→ buyer authentication
→ one prepared order per seller
→ structured WhatsApp handoff
→ seller-owned confirmation and fulfillment
```

Opening WhatsApp means only `handoff_opened`. It does not prove that the prepared
order was sent, accepted, paid, delivered, or completed as a sale.

## Current implementation boundary

The local implementation through the Corte 5 preparation now provides:

- public search, class/presence/availability filters, typo tolerance, sorting,
  and pagination;
- comparable price, availability, freshness, coverage/window, fulfillment, and
  class-specific next-step context before a conversation starts;
- honest empty and stale states; stale structured metadata does not claim
  current stock;
- fixed-location, mobile-coverage, and remote seller presences;
- seller-owned offers and class-aware mobile self-service for creating,
  publishing, correcting, pausing, republishing, and reconfirming offers;
- a Siguatepeque map for confirmed physical locations;
- a canonical `/carrito` flow (with the internal `/seleccion` URL redirected)
  that collects quantity, window, appointment, quote scope, or digital scope as
  required by each class;
- a transactional context check before preparation; changed price,
  availability, semantics, or freshness must be reviewed again;
- exactly one immutable request per seller presented as a separate WhatsApp
  order, with class-specific wording,
  buyer history, and a private seller inbox;
- separate signals for request preparation, WhatsApp opening, and the seller's
  voluntary confirmation that the request was understood; none proves that a
  WhatsApp message was sent, accepted, paid, delivered, or completed as a sale;
- reports, human-reviewed public notes, privacy-safe metrics, retention, and
  account deletion;
- a local research protocol and an eleven-sheet evidence workbook for buyer
  interviews, seller maintenance, 100-business census, 20-query comparative
  audit, later pilot runs, and a cohort matrix that aggregates only rows marked
  as observed;
- Supabase/PostgreSQL/PostGIS migrations, RLS, and automated tests.

The v2 migration, discovery RPC and fixtures, views, RLS, snapshots, TypeScript
consumers, class-specific request payloads, seller maintenance flow, reviewed
context, handoff snapshots, seller understanding signal, privacy-safe metrics,
and Corte 5 instruments are implemented and verified locally. The same schema
and 23 migrations are deployed to the isolated `la-pulperia-preview` Supabase
project. The dated cleanup receipt left its app data, Auth users, sessions, and
Storage objects empty for human review; their current counts were not queried in
this publication pass. Public execution of privileged
functions is limited to the audited RPC surface. The workbook starts every
research row as pending and keeps real copies under a Git-ignored local
directory. Interviews, the 100-business census, the comparative audit with 20
real searches and field use still require separate evidence and owner judgment.

That prelaunch receipt also recorded an accepted mobile visual direction, a
public path inspected at 390 px, the two Vercel URLs, noindex protections, and a
Google OAuth exercise that returned to cart and account before cleanup. It is
historical evidence. The current remote data count, OAuth configuration and
deployment state were not queried in this documentation pass; they must not be
inferred as empty, connected or current from this README. Publication at the
recorded date did not imply owner acceptance, launch or field evidence.

## Visual direction and local implementation

The former **Mostrador** and **Tabula** directions were rejected on 2026-08-29.
Their explorations, global styles, favicon, generated social image, PostCSS, and
Tailwind tooling were removed.

A later Corte 6 produced an accepted mobile direction after the v2 contract and
repairs stabilized. Corte 7 implements that direction on the real states:
global tokens and typography, responsive navigation and forms, public search,
real map, comparable offer cards, detail, cart, buyer surfaces and seller
maintenance. Buyer account/history and seller operation have distinct navigation,
hierarchy, empty/error states, progressive disclosure, and action feedback.
Missing seller media uses an explicit class fallback rather than inventing a
product photo.

On 2026-09-01 Ale selected a replacement identity direction in the parent
project: a hand-painted-sign wordmark and an `LP` monogram whose `P` contains a
barred service window, using warm ivory, weathered cobalt and faded brick red.
That selection is documented in `../Obra/DESIGN.md` and is now the only
authorized direction. The three derived mobile images are closed studies, not
competing references. Corte 7V is implemented and published from GitHub `main`:
real brand assets,
Alegreya + Fira Sans Condensed, canonical color tokens, and the new responsive
system now cover the public journey, cart and identity, seller work, operation,
loading, empty and error states. Browser inspection covered public, buyer and
seller surfaces at 390/1440 px and the existing 320 px reflow receipt; no visual
P0–P2 remains. This is technical and visual QA, not Ale's runtime acceptance.

The seller operation now prioritizes requests, freshness, and inactive offers;
offers can be reconfirmed from the dashboard without altering their published
facts. Seller navigation keeps the buying cart out of the operating context,
offer creation previews the public reading before publishing, presence setup
requires an explicit serving mode, and the inbox preserves each structured
request reference. These controls still lead to seller-owned WhatsApp; they do
not represent payment, acceptance, a sale, delivery, or a chat inside the app.

`design-qa.md` records the selected source, side-by-side comparisons, iteration
history and the final `passed` result. The local production build was exercised
through search, offer detail, all four request contracts, a multi-seller cart,
buyer account/history, and seller dashboard/settings/inbox at 320, 390, and
1440 px. Existing cart requests survive reopening, query-only history keeps the
search controls and mobile menu synchronized, and no P0–P2 visual finding remains.
The Corte 7 receipt remains a recoverable technical baseline, not human
acceptance. Ale authorized the parent project’s **Corte 7R — Vitrina pública y
trabajo del vendedor** for local implementation. `/vender` now explains the
work before authentication, the same account can return to buying, and the first
offer starts as a versioned device-local draft that stays outside the catalog.
The seller completes the business, verified WhatsApp and a deliberately chosen
attention/fulfilment contract before publication; no location or generic
fulfilment is assumed. Daily maintenance names the exact request or offer, links
or submits directly to it, and states that freshness does not change price or
record a sale. The parent plan and implementation contract remain authoritative.
Commit `a2ad7bee376a7edc13ee24dc8b17c60d7cf4baba` published that visual runtime
from GitHub `main`; Vercel reported production deployment
`dpl_Ck7s6kmsupaAkCp7LX1c1tRvqU7L` as `READY` on the public prelaunch aliases.
The deployment remains outside search indexes, remote Supabase data was not
reset, and Ale's human runtime acceptance remains separate.

The parent `../AGENTS.md` requires every product, contract, route, status, or
evidence change to update all related documentation in the same work. The
single active roadmap is `../Obra/Implementation Plan.md`.

## Evidence

After the bug-repair plans 001–005 on 2026-08-30, the local tree passed:

- ESLint;
- generated Next route types and TypeScript;
- 76 deterministic unit tests;
- production build;
- a clean Supabase database reset and deterministic seed;
- 231 pgTAP database, constraint, RPC, and RLS tests;
- Supabase lint on the owned `public` schema with no errors;
- the production dependency audit with no known high-severity vulnerabilities;
- production runtime header checks on home, search, map, auth, and robots;
- 32 Playwright journeys in mobile and desktop, including 320 px reflow and no serious or
  critical Axe violations;
- public runtime HTML checks across search, offer, seller, sitemap, and robots
  with no email, phone, or secret markers;
- the evidence workbook reopened with no formula errors and all eleven sheets
  passed a visual layout inspection.
- after the visual implementation and cloud hardening, a clean local database
  passed all 239 pgTAP checks and schema lint; ESLint, generated route types,
  TypeScript, all 81 unit
  tests, the production build, and production dependency audit passed again;
  all 32 Playwright journeys passed in mobile and desktop, including Axe and
  query-history regressions. Authenticated buyer and seller flows were also
  observed manually at 390 and 1440 px. `git diff --check` remained clean.
- A prior Corte 7R receipt recorded ESLint, generated route types, TypeScript,
  84 Vitest tests and 36 Playwright journeys in desktop/mobile Edge, plus visual
  inspection at 320, 390 and 1440 px. It is historical evidence for that run.
  On 2026-09-01 the checkout was clean on `main` at
  `a6d375f16da4618bd57d9a6068d0d41d457743f7`, with local `origin/main` and
  `origin/HEAD` refs at the same commit. This visual-design pass did not fetch or
  rerun lint, types, tests, build, database gates or E2E, so current verification
  and remote/deployment state remain unverified.
- The 2026-09-02 Corte 7V receipt rebuilt the local database and passed all 239
  pgTAP checks, schema lint, ESLint, generated route types, TypeScript, 84 Vitest
  tests, the production build, dependency audit and `git diff --check`. The
  current reference/runtime comparison covers public and seller work with no
  visual P0–P2. The 36-test Playwright retry remains environmentally blocked:
  the sandbox could not spawn Chromium and Docker Desktop then lost its Linux
  engine before a clean out-of-sandbox repetition. It is not reported as green.
- A prior public OAuth exercise selected the authorized Google test account,
  consented only to basic identity and email, returned to `/carrito`, exposed the
  authenticated navigation and opened `/cuenta`. The parent context records a
  subsequent cleanup, while an earlier version of this README claimed one identity
  remained. This pass did not query Supabase, so the current remote record count
  is unverified.

The historical local receipt records the technical contract and exercised flows.
The current pass verifies the gates named above and the observed browser
surfaces; it does not claim a green E2E run. The production check of the visual
commit returned 200 on home, search, map, login and `robots.txt`, with the new
brand assets and `X-Robots-Tag: noindex, nofollow`; neither that deployment nor
the earlier remote-data receipt
proves commercial demand, legal readiness, field use, or visual acceptance.

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
| Mobile/remote fixture seller | `canasta@local.test` | `pulperia-local` |
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
configured public source. The regional runtime artifact is versioned so Git-based
deployments include the same map that was verified locally.

`PULPERIA_PRELAUNCH=true` makes this code emit `noindex` and block crawlers. A
prelaunch receipt recorded Google OAuth in test mode for the authorized account;
verify the deployed environment before treating that configuration as current.
A production consent posture, custom domain, automated messages, spending,
seller onboarding, and field research remain intentionally unconfigured in this
project contract.

## Source status

La Pulpería is an independent project by Alejandro, published through
[`Aleverus`](https://github.com/Aleverus) for inspection and evaluation. No
open-source license is granted unless a file states otherwise.
