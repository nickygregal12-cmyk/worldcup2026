> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# Functional Ledger update draft — locked set v5

## Recording-stage rows to add

Add rows for these reference/adoption stages, with status `RECORDED / REFERENCE ONLY` until implemented:

| Stage | Scope | Notes |
|---|---|---|
| `CONTRACTS-REF-HOME-MATCH-PLAYER-POINTS` | Home B, Match Centre A, Player View A, Points Breakdown A | Visual contracts confirmed; final sweep required before implementation. |
| `CONTRACTS-REF-ACCOUNT-TOURNAMENT-RULES-ADMIN` | Account B, Tournament Overview A, How to Play / Rules Hub A, Admin Control Room A | Account B removes retired import buttons; Tournament content needs final improvement. |
| `CONTRACTS-REF-RESULTS-LEADERBOARDS-CLAIM` | Results, Leaderboards, Offline Player Claim | Results carries functional interactions: every result opens Match Centre; live projection → confirmed tie → real result state model. |
| `CONTRACTS-REF-HEALTH-TEAM-STATES` | Bracket Health, Team Profile Sheet, Shared States | Bracket Health tab inside Bracket; Team Profile objective info; Shared States common UI rules. |
| `ROADMAP-HOME-MISSING-SURFACES-1` | Home Clarity and missing-surface roadmap | Records build brief decisions only; no implementation. |

## Future implementation stages

Recommended order:

1. `STAGE-HOME-CLARITY-1`.
2. 13G-C correctness queue: Original bracket coherence after group-score edits, predicted group standings and shared third-place table.
3. `STAGE-REVIEW-PICKS-1`.
4. `STAGE-PREDICTION-TRENDS-1`.
5. `STAGE-WELCOME-AND-JOIN-1`.
6. `STAGE-ACTIVITY-UPDATES-1`.
7. `STAGE-LEAGUE-SETTINGS-1`.
8. `STAGE-MATCH-CENTRE-TRENDS-1`.

## Stage cautions

### Results

Although recording is docs/reference only, Results implementation later needs behaviour tests because it introduces:

- result-card navigation to Match Centre;
- live knockout projection via existing resolver and third-place allocator reuse;
- projection → confirmed tie → real result replacement;
- no second calculator;
- no predicted/live bracket blending.

### Home

Home implementation later needs state/flicker tests because wrong transient states are explicitly unacceptable.

### Review Picks

Review Picks may touch tournament-wide pick placement, top scorer and group goals/tiebreak. Do not implement until scope confirms existing supported data and boundaries.

### Prediction Trends

Prediction Trends must be post-lock only and privacy-safe.

### Support and Privacy

Support and Privacy are public-signup prerequisites. Do not open public signup until these gates are closed.


### Correctness queue

The three existing `MISSING` 13G-C rows remain live and must not be lost under the design programme:

- Original bracket coherence after group-score edits.
- Predicted group standings.
- Shared third-place table.

Home Clarity may go first as an explicit exception because it is not dependent on those rows. Review Picks, Results/Tables adoption and any shared table work should not proceed until the queue is consciously resolved or re-sequenced by Nicky.
## Future ledger row — Candidate Team Pool

| Stage | Status | Scope | Notes |
|---|---|---|---|
| STAGE-CANDIDATE-TEAM-POOL-1 | FUTURE / NOT STARTED | Staging/admin data model | Realistic candidate UEFA team pool and future draw-slot assignment workflow. Must preserve official slot identity, avoid public confirmation claims, avoid prediction rewrites, avoid scoring/resolver changes, and avoid Migration 019 unless explicitly approved after proof of need. |

## Future ledger row — STAGE-ADMIN-SCENARIO-RUNNER-1

| Stage | Status | Scope | Notes |
|---|---:|---|---|
| STAGE-ADMIN-SCENARIO-RUNNER-1 | PLANNED | Admin/staging testing | Pair fake clock with safe simulated results. Simulate to fake-clock time, checkpoint or exact match. Must keep simulated results separate from official results, normal scoring and production-visible surfaces unless explicitly in simulation/test mode. Requires reset/clear controls and fail-closed environment checks. No Migration 019 unless proved and explicitly approved. |

This stage is not part of the locked visual-contract recording commit. It is recorded as future
admin/staging testing scope.

## Streamlined remaining batch rows

| Order | Stage | Status | Purpose |
|---:|---|---:|---|
| 0 | CONTRACTS-REF-LOCKED-SURFACES-3 | NEXT | Record v6/v7 docs, visual contracts, safety briefs and streamlined plan. Docs/reference only. |
| 1 | STAGE-RULES-SCORING-LOCK-1 | PLANNED | Lock scoring, tiebreaks and public rules copy before Review/Trends/scoring displays. |
| 2 | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 | PLANNED | Home, Review, Welcome, Invite/Join and no-flicker entry journey. |
| 3 | STAGE-MORE-ACCOUNT-TRUST-1 | PLANNED | More, Account, Support, Privacy, Settings, About and signup trust surfaces. |
| 4 | STAGE-TOURNAMENT-STORY-SURFACES-1 | PLANNED | Prediction Trends, Activity and Match Centre trends. |
| 5 | STAGE-LEAGUE-MANAGEMENT-1 | PLANNED | League Settings / Manage League owner tools. |
| 6 | STAGE-CONTEXTUAL-SURFACES-1 | PLANNED | Bracket Health, Team Profile, Shared States and contextual return. |
| 7 | STAGE-CANDIDATE-TEAM-POOL-1 | PLANNED | Candidate team pool and draw slot assignment. |
| 8 | STAGE-ADMIN-SCENARIO-RUNNER-1 | PLANNED | Fake clock + simulated results with strict simulation safety. |
| 9 | STAGE-LEGACY-REFERENCE-CLEANUP-1 | PLANNED | Legacy/reference cleanup after replacements exist. |
| 10 | STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1 | PLANNED | Full tournament, load, scoring and readiness acceptance. |

## Unresolved group tiebreaker stage notes

| Stage | Additional requirement |
|---|---|
| STAGE-RULES-SCORING-LOCK-1 | Record the predicted group resolver rule for unresolved tied teams after calculable score-derived tiebreakers fail. |
| STAGE-ENTRY-AND-REVIEW-JOURNEY-1 | Implement the calm tied-team order prompt and ensure Review Picks blocks full completion until required orders are chosen. |

This feature must not be treated as an extra scoring opportunity. It only records intended predicted order
where the app cannot determine order from the user's scores.

## Edge-case rules batch placement

| Addition | Batch placement |
|---|---|
| In-group unresolved tiebreaker prompt | STAGE-RULES-SCORING-LOCK-1 + STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Best third-place resolver prompt | STAGE-RULES-SCORING-LOCK-1 + STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Bracket invalidation after score edits | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Joker confirmation modal | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Group goals auto-calculated only | STAGE-RULES-SCORING-LOCK-1 + STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Locked prediction snapshot | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Joining league after lock | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 / STAGE-LEAGUE-MANAGEMENT-1 |
| KO scoring examples | STAGE-RULES-SCORING-LOCK-1 |
| Postponed/delayed/abandoned match states | STAGE-RULES-SCORING-LOCK-1 + STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1 |
