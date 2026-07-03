# Euro 2028 Predictor — Stage 13G-B Player Insight and Team Profile lifecycle alignment

Date: Friday 3 July 2026
Starting checkpoint: `a651d33 Align Euro league lifecycle`
Scope: Player Insight and Team Profile lifecycle copy
Database change: none
Migration 019: none

## Purpose

This slice brings the remaining player-context surfaces into the same central lifecycle model already used by Home, prediction surfaces, Results, Match Centre, Leagues and member comparisons.

The implementation is deliberately presentation/model only. It does not change scoring, result resolution, privacy gates, read RPCs, database policy, schema or migrations.

## Player Insight alignment

Player Insight now derives a competition-scoped lifecycle note from the central tournament lifecycle state.

The lifecycle copy distinguishes:

- Original Predictor before the global lock;
- Original Predictor after the global lock but before scoring evidence exists;
- Original Predictor scoring evidence;
- KO Predictor fixture-by-fixture release;
- KO Predictor scoring evidence.

The canonical server privacy phrase remains active:

```text
Only selections released by the existing server privacy rules are shown.
```

Original and KO Predictor point evidence remains separated. Original points are described as group scores plus the winner-only pre-tournament bracket. KO points are described as real knockout fixtures only.

## Team Profile alignment

Team Profile now receives central lifecycle input from `App` through `TeamProfileProvider` and renders lifecycle copy inside the Prediction outlook section.

The Team Profile prediction outlook remains Original Predictor only:

- community percentages are based on complete Original Predictor brackets only;
- pre-lock aggregate visibility remains private unless the authorised read model releases it;
- KO Predictor data is not included;
- Original/KO points are never combined.

The existing server read response remains authoritative for aggregate visibility. Central lifecycle copy explains the phase; it does not override the protected payload.

## Audit and tests

This slice adds:

```text
audit:player-team-lifecycle
```

The audit confirms:

- `PlayerInsight` uses `buildPlayerInsightLifecycle()`;
- `PlayerHeadToHead`, Results and Leagues pass lifecycle context into Player Insight;
- `TeamProfileSheet` uses `buildTeamProfileLifecycle()`;
- `TeamProfileProvider` receives lifecycle from `App`;
- canonical privacy and competition-boundary wording remains active;
- active migrations remain at 18;
- no Migration 019 exists.

Focused tests cover the new Player Insight and Team Profile lifecycle models and rendered lifecycle copy.

## No database migration

No database migration belongs to this slice. Active migrations must remain at 18 and there must be no Migration 019.
