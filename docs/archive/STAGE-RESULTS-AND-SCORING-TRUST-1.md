> **ARCHIVED — historical record of completed work.**
> This document is frozen. It describes work that is finished and it is NOT current guidance:
> do not derive present state, scope or decisions from it. The living document set is indexed by
> `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`, which is the only index that describes what is true now.

# STAGE-RESULTS-AND-SCORING-TRUST-1 — Results and Scoring Trust Recording

Status: complete once committed and verified.
Type: docs/audit-only recording stage.

## Scope

This stage records the user-facing trust contract for results, scoring and leaderboard freshness before any implementation work. It covers how the app should explain match/result states, point awards, corrections, recalculations and competition separation without changing the scoring engine.

It records:

- results status wording;
- scoring explanation;
- correction/recalculation wording;
- why did I get these points? clarity;
- Original vs KO points separation;
- admin result-entry trust copy;
- pending/delayed/postponed/suspended/abandoned/replay states;
- leaderboard freshness wording;
- fake/simulated result separation;
- public signup still closed until implementation gates are complete.

## Results status wording

Result surfaces should explain whether a match is upcoming, live, final, result pending, delayed, postponed, suspended, abandoned or replay required. The wording should be calm and factual, with one clear reason why points are or are not showing.

A result must not look official unless it has come from the recorded canonical result path. The app should avoid ambiguous labels such as "complete" where the scoring state is still unresolved.

## Scoring explanation

The scoring explanation should show the relevant competition, the match or prediction item, the user's pick, the official result where available, and the point rule that was applied.

The explanation must preserve the locked scoring contract. Correct-score and correct-result points must not be described as cumulative if the scoring contract says they are not. Group-goals totals must be described as calculated from the 36 group scores, not typed manually.

## Correction/recalculation wording

Correction and recalculation wording should explain that official-result corrections are revisioned, audited and recalculated. Users should understand that a correction may change points, ranks and gaps after the recalculation completes.

The wording should avoid blaming the user for point changes caused by admin corrections, result corrections or recalculation timing.

## Why did I get these points? clarity

A user should be able to answer "why did I get these points?" without reading the full rules page. The target is a compact points explanation available from results, player insight, Match Centre or leaderboards where implementation later chooses.

The explanation should cover exact score, result/outcome, advancing team, method, joker multiplier, group position, bracket milestone, champion, top scorer and calculated group-goals rules where relevant.

## Original vs KO points separation

Every scoring trust surface must make clear whether it is explaining Original Predictor points or KO Predictor points. Original Predictor and KO Predictor totals, ranks, corrections and tied-rank ladders remain separate.

No user-facing copy should imply that KO Predictor points repair, boost, replace or combine with Original Predictor points.

## Admin result-entry trust copy

Admin result-entry trust copy should make clear that official result entry is controlled, revisioned and audited. Result admins and owners should understand when a result is pending, saved, corrected, reconciled or awaiting recalculation.

The user-facing trust layer should not expose private audit detail, but it should explain enough to make score/rank changes feel trustworthy.

## Pending/delayed/postponed/suspended/abandoned/replay states

Non-standard match states must be handled explicitly:

- pending result;
- delayed match;
- postponed match;
- suspended match;
- abandoned match;
- replay required;
- result pending official confirmation.

These states should not score until the official result state is valid. The app should explain whether points are waiting, provisional display is blocked, or recalculation is required.

## Leaderboard freshness wording

Leaderboards should state when points were last recalculated or when points may still be waiting on official confirmation. Freshness wording should reduce confusion on matchdays and after corrections.

If implementation later shows optimistic or pending indicators, the copy must not imply that an unconfirmed result has awarded final points.

## Fake/simulated result separation

Fake/simulated result separation is mandatory. Admin Scenario Runner output, fake scores, testing seeds and simulated results must never be confused with real official results and must never award real points.

Any scenario/testing surface should use clear test-only labels and storage boundaries. Simulated results must not pollute production, canonical official results, real leaderboards or real scoring.

## Boundary

This stage is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations.

Active migrations remain 18. Migration 019 is not created. Public signup remains closed until implementation gates are complete.
