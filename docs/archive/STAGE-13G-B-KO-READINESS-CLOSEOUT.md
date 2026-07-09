> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-B — KO-readiness signal close-out

Date: Friday 3 July 2026
Starting checkpoint: `659809c Correct Stage 13G-B ledger checkpoints`
Scope: Home, Navigation and Leagues KO-readiness alignment
Database change: none
Migration 019: none

## Purpose

This slice closes the partial Central KO-readiness signal row from Stage 13G-B. Home already exposed a KO-readiness signal, but Navigation and Leagues still derived or inferred readiness separately. This package turns that into one shared model consumed by all three surfaces.

## Accepted behaviour

- Home consumes `buildKoReadiness(reference)` instead of a local helper.
- Navigation consumes the same shared readiness object and still preserves the approved five-position lifecycle.
- Groups remains the primary position until every group result is confirmed, every Round of 16 pairing is resolved and the resolver is healthy.
- Early KO access remains in More only when at least one real Round of 16 fixture is ready.
- Leagues receives the same readiness signal from `App`.
- KO league summaries, tabs and standings remain hidden or disabled before the shared readiness signal opens.
- Original Predictor league release remains based on the global prediction lock.
- KO Predictor league release remains fixture-by-fixture after real knockout fixtures are available and started.
- Original and KO Predictor totals remain separate.

## Files touched

- `src/app/koReadiness.js`
- `src/app/navigationLifecycle.js`
- `src/app/__tests__/navigationLifecycle.test.js`
- `src/App.jsx`
- `src/home/homeDashboardModel.js`
- `src/home/__tests__/homeDashboardModel.test.js`
- `src/leagues/Leagues.jsx`
- `src/leagues/LeaguePresentation.jsx`
- `src/leagues/leagueModel.js`
- `src/leagues/__tests__/leagueModel.test.js`
- `scripts/check-stage13g-home-lifecycle.mjs`
- `scripts/check-stage13g-league-lifecycle.mjs`
- `scripts/check-stage13g-ko-readiness.mjs`
- `package.json`
- roadmap, register and ledger documents

## Acceptance

Run:

```bash
npm run audit:home-lifecycle
npm run audit:league-lifecycle
npm run audit:ko-readiness
npm test -- src/home/__tests__/homeDashboardModel.test.js src/app/__tests__/navigationLifecycle.test.js src/leagues/__tests__/leagueModel.test.js
npm run check
```

Expected:

- All focused audits pass.
- The full gate passes.
- Active migrations remain 18.
- No Migration 019 exists.
