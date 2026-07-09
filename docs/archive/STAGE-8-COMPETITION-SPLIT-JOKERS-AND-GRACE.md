> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 8 — Competition Split, Jokers and Grace

## Confirmed product decision

The original predictor and KO Predictor are separate competitions.

| Competition | Predictions | Jokers | Points |
|---|---|---:|---|
| Original predictor | 36 group scores + 15 winner-only pre-tournament bracket picks | 5 on group matches; 0 on bracket picks | Original total and future leaderboard |
| KO Predictor | 15 real knockout fixtures: 90-minute score, advancing team and method | 5 | Separate total, future leaderboard and winner |

KO Predictor points are never added to original-predictor points.

## Migration 010

Migration 010:

- adds `competition_key` to prediction sets and grace windows;
- allows one original and one KO Predictor set per user/tournament;
- creates winner-only `bracket_predictions`;
- migrates existing Stage 7 bracket winners and removes original knockout score rows;
- confirms joker caps at five group and five separate KO Predictor jokers;
- replaces the original save RPC with the winner-only bracket contract;
- creates the separate KO Predictor save RPC;
- enforces competition-specific row types, revisions, locks and grace;
- retains RLS and no direct browser table writes.

## Lock behaviour

- Original score and bracket content freezes globally.
- A group joker may move after global lock only between group matches that have not started.
- A started group joker is fixed.
- KO Predictor score, method, advancement and joker lock at that real match's kick-off.
- Grace never crosses from one competition to the other.

## Verification

```bash
npm run audit:competition-split
npm run check
npx supabase db reset
npm run test:db:009:local
npm run test:db:010:local
```
