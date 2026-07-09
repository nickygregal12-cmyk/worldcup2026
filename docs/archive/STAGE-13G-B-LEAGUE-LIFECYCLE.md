> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-B — League Lifecycle Alignment

Checkpoint base: `03bc447 Align Euro results lifecycle`.

## Scope

This slice aligns the private league and member-comparison surfaces with the central tournament lifecycle model introduced during Stage 13G-B. It keeps the existing database contracts and server-authorised privacy boundaries unchanged.

## Implemented

- `Leagues` now receives the central lifecycle object from `App`.
- Private leagues show a lifecycle banner explaining when Original Predictor and KO Predictor league data becomes meaningful.
- Competition tabs show release copy scoped to the selected competition.
- Original Predictor league comparison copy is tied to the global prediction lock.
- KO Predictor league comparison copy is tied to fixture-by-fixture release after each real knockout fixture starts.
- Player head-to-head copy now states the two release models explicitly.
- The comparison model exposes release-state copy without combining Original and KO Predictor totals.
- `audit:league-lifecycle` is included in `npm run check`.

## Acceptance

Required acceptance gate:

```bash
npm run audit:league-lifecycle
npm run check
```

The audit must confirm:

- central lifecycle input reaches Leagues;
- private league copy uses competition-scoped release rules;
- member comparisons keep Original global-lock release separate from KO fixture-by-fixture release;
- active migrations remain at 18;
- latest migration remains `202607030018_euro28_complete_admin_operations.sql`;
- Migration 019 does not exist.

## Database

No database migration. No database contract change. No Migration 019.
