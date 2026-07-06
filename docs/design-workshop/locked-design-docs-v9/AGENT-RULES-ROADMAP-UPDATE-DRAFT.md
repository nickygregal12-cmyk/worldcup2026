# Agent Rules / Roadmap update draft — locked set v3

## Add to agent rules

### Same design system

All new pages must use the approved Euro 2028 visual system. Groups and Leagues remain the anchors, with Bracket G and KO Predictor F now also approved major references.

### No wrong-state flicker

Dynamic pages must not briefly show incorrect CTAs, lock states, signed-out states, guest warnings, competition states or navigation actions while loading. Use neutral shimmer/skeleton/settling states when canonical state is not known.

### Contextual return

Any page, sheet, modal or detail surface opened by clicking from another known origin must provide a clear return to that origin. This does not apply to normal bottom-nav movement.

### Do not revive old WC26 surfaces as-is

Old WC26-era pages and concepts are reference only unless explicitly re-scoped for Euro.

## Roadmap additions

### Recording

- `CONTRACTS-REF-LOCKED-SURFACES-2`: record visual contracts and missing-surface decisions.
- `DESIGN-FINAL-SWEEP-1`: remove prototype/internal/provisional public-UI content and tighten all approved references.

### Implementation

1. `STAGE-HOME-CLARITY-1`.
2. `STAGE-REVIEW-PICKS-1`.
3. `STAGE-PREDICTION-TRENDS-1`.
4. `STAGE-WELCOME-AND-JOIN-1`.
5. `STAGE-ACTIVITY-UPDATES-1`.
6. `STAGE-LEAGUE-SETTINGS-1`.
7. `STAGE-MATCH-CENTRE-TRENDS-1`.

## Home Clarity acceptance summary

Home is complete only if:

- it uses one Original Predictor countdown;
- it has no KO Predictor presence before readiness;
- its primary CTA follows actual Original Predictor progress;
- it does not flash wrong CTAs or account/guest/lock states;
- it uses neutral loading/skeleton where needed;
- matchday rows are ordered live → upcoming → finished;
- between-match, end-of-day and rest-day states are handled;
- Original and KO points remain separate;
- Original Predictor keeps priority over KO Predictor;
- no schema, migration, scoring, resolver or Auth changes are introduced.


## Additional locked notes added in v3

- Result corrections are not normal Home content. Home should not promote a standing correction card; exceptional corrections should be explained only where they affect visible points, normally Results, Match Centre or Points Breakdown.
- Prediction Trends requires detailed live-tournament scope: post-lock aggregate snapshot first, then group-stage and knockout-stage trend stories from More, with Original Predictor primary and KO Predictor trends clearly secondary.


## v5 sequencing correction

Design/reference work must not silently jump the correctness queue. Home Clarity may go first because it is the highest-impact easy win and does not depend on the open 13G-C correctness rows. After Home Clarity, the roadmap must explicitly schedule or consciously re-sequence:

- Original bracket coherence after group-score edits.
- Predicted group standings.
- Shared third-place table.

Also record the final-standings tie-break ladders in the Decision Register before implementation begins.
## Candidate-team-pool roadmap note

Add a future non-visual staging/admin data stage:

`STAGE-CANDIDATE-TEAM-POOL-1`

Scope:

- inspect current Euro team/participant/slot model;
- record or add a realistic candidate UEFA team pool in the safest existing place;
- keep A1–F4 official draw slots stable;
- keep candidate teams separate from official slot assignment;
- document future Admin assignment workflow;
- avoid Migration 019 unless a genuine schema/read-contract gap is proved and explicitly approved.

Hard boundary: candidate teams must not be presented publicly as confirmed Euro 2028 teams until officially qualified/drawn and deliberately assigned.

## Admin Scenario Runner safety rule

Any future Scenario Runner implementation must obey this hard rule:

> Fake clock + fake scores can simulate the tournament for testing, but they must never become the
> official result source of truth.

Agents must not:

- write simulated scores into official result state without explicit approved simulation isolation;
- let normal scoring read simulated results;
- let Bracket Health, Prediction Trends or public Results read fake scores in normal mode;
- create Migration 019 unless a genuine schema/read-contract gap is proved and Nicky explicitly approves it;
- touch WC26 production;
- treat reset/reapply simulation controls as normal public result-correction behaviour.

If source separation cannot be guaranteed, the Scenario Runner must remain preview-only.

## Streamlined remaining-jobs sequencing rule

Use the grouped batch order from `STREAMLINED-BATCH-ORDER.md`.

Do not split work into tiny stages where the same files, routes or user journeys would be edited
repeatedly.

The governing order is:

```text
0. CONTRACTS-REF-LOCKED-SURFACES-3
1. STAGE-RULES-SCORING-LOCK-1
2. STAGE-ENTRY-AND-REVIEW-JOURNEY-1
3. STAGE-MORE-ACCOUNT-TRUST-1
4. STAGE-TOURNAMENT-STORY-SURFACES-1
5. STAGE-LEAGUE-MANAGEMENT-1
6. STAGE-CONTEXTUAL-SURFACES-1
7. STAGE-CANDIDATE-TEAM-POOL-1
8. STAGE-ADMIN-SCENARIO-RUNNER-1
9. STAGE-LEGACY-REFERENCE-CLEANUP-1
10. STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

This order may only be changed by an explicit recorded decision.

## Unresolved predicted group tiebreaker rule

Agents must not let predicted group tables silently choose arbitrary ordering where the user's completed
score predictions leave two or more teams tied after all supported score-derived tiebreakers.

The app must prompt the user to choose the intended order only when the app cannot calculate the order
from the score predictions.

This rule:

- applies only to predicted group tables;
- must not award extra points;
- must not alter official real result tables;
- must not override calculable tiebreakers;
- must be reflected in Review completion state.

## Edge-case rules carry-forward

Agents must carry the Edge-Case Rules Addendum into future implementation planning.

Do not turn these into separate standalone stages. Place them into the streamlined batches:

- Batch 1: rules/scoring/resolver lock and KO scoring examples.
- Batch 2: Groups/Review prompt flow, bracket invalidation, joker modal, locked snapshot.
- Batch 5: league-after-lock display/management where relevant.
- Batch 10: non-standard match-state acceptance.

Important correction:

Group goals are auto-calculated only from group-score predictions. Do not implement manual editing unless
Nicky explicitly reopens this decision.
