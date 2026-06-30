# Stage 2 — Application Isolation

## Batch 1: Quarantine the inherited WC26 application

Prepared: 30 June 2026

Hosted verification is still required before this batch is marked complete.

## Why this batch is required

The Euro staging database is clean, but the browser application was still the inherited WC26 product.

The pre-isolation audit found:

- 73 inherited files reachable from the active application entrypoint;
- 36 database table names referenced across the source tree;
- 22 source files containing legacy browser write paths;
- 12 inherited Netlify functions;
- 42 source files containing WC26, World Cup, Round of 32 or related assumptions;
- WC26 titles, descriptions, URLs and PWA metadata on the Euro staging site;
- an inherited service worker capable of retaining WC26 pages and assets in browser caches.

The clean Euro database does not contain the inherited profiles, predictions, leagues, scoring or admin tables. Leaving the old application active would produce misleading screens, failed queries and an unsafe basis for future Euro development.

## Isolation decision

The inherited application has been quarantined rather than deleted.

The files remain available for later feature-by-feature review, but the active browser entrypoint no longer imports:

- inherited pages;
- inherited components;
- the WC26 Zustand store;
- authentication helpers;
- prediction or league logic;
- admin tools;
- WC26 bracket, date or scoring modules.

The new active application contains only a small Euro foundation screen and its read-only data loader.

## New active foundation

The foundation screen:

- identifies itself as the Euro 2028 development environment;
- connects only to the Euro staging Supabase project configured through browser-safe variables;
- uses a client with authentication persistence and URL session detection disabled;
- reads only the public tournament-reference tables created in Stage 0 and Stage 1;
- displays the verified tournament totals and stage structure;
- keeps schedule certainty separate from participant and kick-off-time certainty;
- exposes no browser database writes;
- exposes no registration, sign-in, predictions, leagues, scoring or admin routes.

## Automated boundary

The command below now forms part of `npm run check`:

```bash
npm run audit:legacy
```

It fails if the active application reaches the quarantined page, component, store or legacy application modules. It also fails if active foundation code gains a browser database write or if public staging metadata returns to WC26 branding.

Expected audit result:

- Active foundation files: 8
- Quarantined inherited source files: 74
- Active browser database writes: 0
- Inherited prediction, authentication, league and admin routes: unreachable

## Public staging changes

The package also:

- changes the HTML and manifest branding to Euro 2028 foundation staging;
- blocks search-engine indexing;
- removes the inherited PWA shortcuts;
- stops registering a service worker;
- retires existing WC26 service-worker registrations and WC26 cache names;
- replaces the inherited offline message and favicon with neutral Euro development versions.

The Stage 2 foundation is intentionally not the final public design.

## Database position

This batch contains no migration and makes no database writes.

The four verified Euro migrations remain unchanged:

1. `202606300001_euro28_core_tournament.sql`
2. `202606300002_euro28_provisional_group_slots.sql`
3. `202606300003_euro28_official_group_schedule.sql`
4. `202606300004_euro28_official_knockout_skeleton.sql`

RLS remains read-only for browser clients.

## Required completion checks

Before Batch 1 is marked complete:

- run `npm run check` locally;
- confirm all 15 tests pass;
- confirm the local foundation screen loads the hosted Euro model;
- commit and push only to `euro28-development`;
- confirm the Euro Netlify staging deploy succeeds;
- run `npm run verify:foundation-page` against the deployed site;
- run `npm run verify:knockout` to reconfirm the hosted tournament model;
- confirm the Git working tree is clean.

## Current position

Stage 2 Batch 1 is prepared and locally tested. Hosted deployment verification is pending.

The next controlled batch will document and agree the Euro prediction, lock and score-meaning contracts before any prediction tables or browser write policies are created.
