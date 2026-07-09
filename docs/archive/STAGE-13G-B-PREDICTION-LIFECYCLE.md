> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-B — Prediction Surface Lifecycle Alignment

Checkpoint: `1dda826 Align Euro home lifecycle`

This slice extends Stage 13G-B from Home into the active prediction surfaces without changing the database.

## Scope

- Original Predictor surfaces render the same central lifecycle source used by Home.
- Original Groups, Bracket and Review explain the lock, group-score, winner-only bracket and KO-boundary states in one visible lifecycle strip.
- KO Predictor renders its own real-fixture readiness strip.
- KO Predictor remains closed when knockout fixtures are unresolved, even if the Original Predictor lock has passed.
- Original Predictor and KO Predictor copy continues to state that points, jokers and standings are separate.
- `audit:prediction-lifecycle` is included in `npm run check`.

## Acceptance

- `npm run audit:prediction-lifecycle`
- `npm run audit:home-lifecycle`
- `npm run audit:shared-primitives`
- `npm run audit:interaction-enforcement`
- Focused model tests for Original Predictor and KO Predictor lifecycle states.
- Full `npm run check` before commit.

## Database

No database change. Active migrations remain 18. Migration 019 must not exist for this slice.
