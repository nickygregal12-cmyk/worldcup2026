> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 2 — Application Isolation

## Batch 1: Quarantine the inherited WC26 application

Completed: 30 June 2026

## Why this batch was required

The Euro staging database was clean, but the browser application was still the inherited WC26 product.

The pre-isolation audit found:

- 73 inherited files reachable from the active application entrypoint;
- 36 database table names referenced across the source tree;
- 22 source files containing legacy browser write paths;
- 12 inherited Netlify functions;
- 42 source files containing WC26, World Cup, Round of 32 or related assumptions;
- WC26 titles, descriptions, URLs and PWA metadata on the Euro staging site;
- an inherited service worker capable of retaining WC26 pages and assets in browser caches.

## Isolation decision

The inherited application has been quarantined rather than deleted.

The files remain available for later feature-by-feature review, but the active browser entrypoint no longer imports inherited pages, components, the WC26 store, authentication, predictions, leagues, scoring, admin tools or WC26 bracket/date logic.

## Active foundation

The deployed Euro foundation:

- identifies itself as the Euro 2028 development environment;
- connects only to Euro staging through browser-safe variables;
- reads only the public tournament-reference tables;
- uses no persisted authentication session;
- displays the verified tournament totals and official stage structure;
- exposes no browser database writes;
- exposes no registration, sign-in, predictions, leagues, scoring or admin routes.

## Automated boundary

`npm run audit:legacy` is part of `npm run check` and verifies:

- Active foundation files: 8
- Quarantined inherited source files: 74
- Active browser database writes: 0
- Inherited prediction, authentication, league and admin routes: unreachable

## Public staging verification

Verified on the Euro Netlify staging site:

- Euro 2028 foundation title and metadata;
- search indexing blocked;
- inherited PWA shortcuts removed;
- WC26 service-worker retirement enabled;
- active deployed bundle is the isolated foundation application;
- inherited WC26 admin bundle is inactive.

## Database position

This batch added no migration and made no database writes.

The four verified Euro migrations remain unchanged, and the hosted knockout verification still passes.

## Current position

Stage 2 Batch 1 is complete.

The next controlled batch will document and agree the Euro prediction, lock and score-meaning contracts before any prediction tables or browser write policies are created.
