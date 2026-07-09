> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-B — Results lifecycle alignment

Checkpoint: `177605b Align Euro prediction lifecycle`

This slice aligns the Results, Leaderboards and Match Centre user surfaces with the same central lifecycle model introduced during Stage 13G-B. It is a frontend, model, test, audit and documentation slice only.

## Scope

- Results page receives a lifecycle banner derived from central tournament lifecycle state plus canonical result state.
- Results lifecycle distinguishes pre-tournament, live, review, quiet and completed states.
- Leaderboards receive competition-scoped lifecycle copy for Original Predictor and KO Predictor.
- Match Centre receives fixture-level lifecycle copy for live, review, completed, scheduled and unresolved knockout fixtures.
- `ResultsAndLeaderboards` and `MatchCentre` receive central lifecycle input from `src/App.jsx`.
- `audit:results-lifecycle` is added to `npm run check`.

## Boundaries

- Original Predictor and KO Predictor remain separate.
- Results and live bracket remain canonical live/result context only.
- Leaderboard copy does not combine competitions.
- Match Centre preserves the existing prediction privacy gates.
- No database migration is included.
- There is no Migration 019.

## Acceptance

Run:

```bash
npm run audit:results-lifecycle
npm run check
```

The audit must prove that the lifecycle models, surface wiring, tests and ledger updates are present, and that active migrations remain at 18 with Migration 018 as the latest contract.
