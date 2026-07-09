> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-A — Route Integrity and Admin Section Destinations

**Starting checkpoint:** `3c41628`  
**Branch:** `euro28-development`  
**Migration boundary:** 18 active migrations; Migration 018 remains latest; no Migration 019.

This batch is the first Stage 13G-A implementation slice. It deliberately fixes the Stage 13F-F failure class before wider central-configuration or interaction-primitive work.

## Scope delivered

- Added a canonical Admin section registry in `src/app/appRoutes.js`.
- Replaced legacy `#admin-*` control-room links with query-addressed protected Admin destinations:
  - `#/admin?section=overview`
  - `#/admin?section=results`
  - `#/admin?section=corrections`
  - `#/admin?section=fixtures`
  - `#/admin?section=phase-features`
  - `#/admin?section=grace`
  - `#/admin?section=time`
  - `#/admin?section=profiles`
  - `#/admin?section=scoring`
  - `#/admin?section=tournament-picks`
  - `#/admin?section=audit`
- Kept all section hashes inside the protected `/admin` application route.
- Added invalid-section recovery so `#/admin?section=bad-value` remains inside Admin and shows Overview with a recovery message.
- Added rendered route coverage for every application destination and every Admin section destination.
- Added a dead-destination audit that scans active source links and fails on legacy `#admin-*` fragments or unresolved `#/...` app hashes.
- Added the route-integrity audit to the full `npm run check` gate.

## Deliberately not included

- No database migration.
- No Migration 019.
- No staging role change.
- No global lock or shared tournament kick-off write.
- No central configuration implementation yet.
- No shared destructive-confirmation primitive yet.
- No design-system selector or refresh-policy rewrite yet.

Those remain in later Stage 13G-A slices.

## Acceptance evidence required

- `npm run audit:route-integrity`
- focused route tests:
  - `src/app/__tests__/appRoutes.test.js`
  - `src/app/__tests__/routeRenderIntegration.test.jsx`
- full `npm run check`
- deployed app-shell verification after push.

## Safety note

The older Stage 13F-F audit remains a presentation audit only. The new Stage 13G-A route-render tests and dead-destination audit are the functional proof that must prevent the previous source-string-only failure from recurring.
