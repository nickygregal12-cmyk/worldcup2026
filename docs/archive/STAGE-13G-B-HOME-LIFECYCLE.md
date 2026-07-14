> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# Stage 13G-B — Home lifecycle alignment

Checkpoint: `08524b6`  
Scope: Home, lifecycle/countdown presentation and Match Centre entry only.  
Database: no change; active migrations remain 18; Migration 019 must not exist.

## Accepted problem

Stage 13G-B begins by removing the remaining Home ambiguity around when the tournament starts, when the Original Predictor locks and what a player should do next. The previous Home surface showed useful progress, but did not make the central lifecycle configuration visible, did not distinguish first-visit from returning guest copy strongly enough and did not own a live-day action hub.

## Implemented contract

- Home consumes `resolveTournamentLifecycle()` through the Home model.
- Date-only staging `starts_on` values no longer override the central precise tournament-start timestamp.
- Home displays both prediction-lock and tournament-start countdowns.
- Home distinguishes first-visit guest, returning guest draft and signed-in prompts.
- Home exposes a Today’s match hub that promotes live or next fixture context into Match Centre.
- Home derives KO Predictor prominence from one Home KO-readiness signal.
- `audit:home-lifecycle` is added to `npm run check`.

## Boundaries

This slice does not implement By group / By date match organisation, group standings, bracket invalidation, nav-wide KO readiness or Euro share assets. Those remain later Stage 13G-B/C work.

## Acceptance evidence

Required local gates:

```bash
npm run audit:home-lifecycle
npm test -- --run src/home/__tests__/homeDashboardModel.test.js src/config/__tests__/tournamentLifecycle.test.js
npm run check
```

Expected invariants:

- 18 active migrations.
- No Migration 019.
- Home countdowns point to the central provisional prediction lock and tournament start.
- Today’s match hub links into Match Centre.
- KO Predictor remains separate from the Original Predictor.
