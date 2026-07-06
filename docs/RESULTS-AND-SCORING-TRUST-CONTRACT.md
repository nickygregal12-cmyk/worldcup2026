# Results and Scoring Trust Contract

This contract is the implementation target for `STAGE-RESULTS-AND-SCORING-TRUST-1`. It records how Euro 2028 Predictor should explain results, scoring, corrections and leaderboard freshness to users without changing the scoring engine.

## Required trust markers

Implementation must cover:

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

## Result-state contract

The result-state contract must distinguish:

- upcoming;
- live;
- final and scoreable;
- pending result;
- delayed match;
- postponed match;
- suspended match;
- abandoned match;
- replay required;
- result pending official confirmation;
- corrected result;
- recalculation pending;
- recalculation complete.

The app must not award or describe final points until the official result state is valid. A visible result can still be non-scoreable if official confirmation or recalculation is pending.

## Scoring explanation contract

Scoring explanations should show the competition, the prediction, the official result or result state, the rule applied and the points awarded or withheld.

They must respect the locked scoring contract:

- correct-score and correct-result points are not cumulative when the contract says they are not;
- group goals are auto-calculated only from the 36 group-score predictions;
- joker multiplier explanations must use the correct competition allowance;
- Original Predictor bracket points are winner/progression picks, not KO Predictor real-match points;
- KO Predictor scoring remains separate from Original Predictor scoring.

## Correction and recalculation contract

Corrections must be described as controlled, revisioned, audited and recalculated. Recalculation wording should explain that points, ranks, gaps and leaderboard positions may change after a correction.

Users should see a plain-English reason for score/rank movement where possible. The wording must not imply that a user lost points because of an action they took when the real cause is result correction, admin correction or recalculation timing.

## Why did I get these points? contract

The app should make "why did I get these points?" answerable from the relevant surface. A compact explanation is enough, but it must be specific.

The explanation should support:

- exact score;
- correct result/outcome;
- advancing team;
- method of advancement;
- joker multiplier;
- group position;
- bracket milestone;
- champion;
- top scorer;
- calculated group-goals total;
- pending official confirmation;
- no points yet because recalculation is pending.

## Competition separation contract

Original Predictor and KO Predictor are separate competitions. Results trust copy, scoring explanation, correction wording, leaderboard freshness wording and tied-rank explanations must never combine them.

Required copy boundaries:

- Original Predictor points remain Original Predictor points;
- KO Predictor points remain KO Predictor points;
- correction/recalculation runs may affect one or both competitions but must explain the affected competition;
- no copy may imply that KO Predictor points repair, boost, replace or combine with Original Predictor points.

## Admin result-entry trust copy contract

Admin result-entry trust copy should explain that official result entry is controlled, revisioned and audited. It should distinguish saved result, corrected result, result pending, reconciliation required and recalculation complete states.

Private audit detail stays protected. Public/player-facing copy should explain the trust state without exposing privileged admin evidence.

## Non-standard match state contract

Non-standard match states must be explicit and non-scoreable until official confirmation allows scoring.

Required states:

- pending result;
- delayed match;
- postponed match;
- suspended match;
- abandoned match;
- replay required;
- result pending official confirmation.

The copy should make clear whether points are waiting, blocked, recalculation pending or complete.

## Leaderboard freshness contract

Leaderboard freshness wording should explain when standings last changed or why they may still change. It should be especially clear after matchdays, result corrections and recalculation runs.

Freshness wording must not imply finality while official confirmation, correction reconciliation or recalculation is pending.

## Fake/simulated result separation contract

Fake/simulated result separation is a hard safety rule.

Admin Scenario Runner output, fake scores, testing seeds and simulated results must:

- use test-only labels;
- be impossible to confuse with real official results;
- never award real points;
- never pollute production;
- never write to canonical official results;
- never affect real leaderboards;
- remain separated from real result-entry and scoring flows.

## Signup and migration boundary

Public signup remains closed until implementation gates are complete. This contract does not open signup, change Auth settings or alter Supabase behaviour.

no Migration 019 is approved by this stage. No Migration 019 is approved by this stage. Active migrations remain 18 unless a genuine schema/read-contract gap is later proved and explicitly approved.
