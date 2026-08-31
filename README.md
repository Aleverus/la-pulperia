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
and deterministic preview fixtures are also deployed to the isolated
`la-pulperia-preview` Supabase project; public execution of privileged functions
is limited to the audited RPC surface. The workbook
starts every research row as pending and keeps real copies under a Git-ignored
local directory. Interviews, the 100-business census, the comparative audit
with 20 real searches and field use still require separate evidence and owner
judgment. A mobile visual direction has been accepted in the parent project
canon and is implemented locally across the active product surfaces. The
production build and the public search → offer → cart path were inspected at
390 px; the visual comparison has no open P0–P2 findings. This is now a
recoverable prelaunch checkpoint published primarily at
`https://la-pulperia-hn.vercel.app`, with
`https://la-pulperia-coral.vercel.app` retained as a transition fallback; both
are explicitly excluded from search indexes. Google OAuth is connected in
controlled test mode, Supabase Email auth is disabled, and a real Google session
started on the new domain has returned to the authenticated cart and account.
Publication does not imply owner acceptance, launch, or field evidence.

## Visual direction and local implementation

The former **Mostrador** and **Tabula** directions were rejected on 2026-08-29.
Their explorations, global styles, favicon, generated social image, PostCSS, and
Tailwind tooling were removed.

A later Corte 6 produced an accepted mobile direction after the v2 contract and
repairs stabilized. Corte 7 now implements that direction on the real states:
global tokens and typography, responsive navigation and forms, public search,
real map, comparable offer cards, detail, cart, buyer surfaces and seller
maintenance. Buyer account/history and seller operation have distinct navigation,
hierarchy, empty/error states, progressive disclosure, and action feedback.
Missing seller media uses an explicit class fallback rather than inventing a
product photo.

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
Ale has not yet accepted the executed result. Supabase and Vercel serve a public
prelaunch from the GitHub `prelaunch` branch, but the human runtime acceptance
and promotion of `main` remain separate.

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
- the public OAuth exercise selected the authorized Google test account,
  consented only to basic identity and email, returned to `/carrito`, exposed
  the authenticated navigation, and opened `/cuenta`; the remote database
  contains one Google identity with its application profile. Google is enabled
  and Email is disabled in Supabase.

This local receipt proves the technical contract and exercised flows. The
separate prelaunch runtime check proves public deployment and remote data reads;
neither proves commercial demand, legal readiness, field use, or visual
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

The public prelaunch uses `PULPERIA_PRELAUNCH=true`, which emits `noindex` and
blocks crawlers until owner launch. Google OAuth is restricted to test mode and
the authorized test account; a production consent posture, custom domain,
automated messages, spending, seller onboarding, and field research remain
intentionally unconfigured.

## Source status

La Pulpería is an independent project by Alejandro, published through
[`Aleverus`](https://github.com/Aleverus) for inspection and evaluation. No
open-source license is granted unless a file states otherwise.
