> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# Missing-surfaces roadmap — after visual contract recording

This roadmap comes from the design workshop and `Euro 2028 Predictor Build Brief.pdf`.

## Highest-impact next implementation

`STAGE-HOME-CLARITY-1`

Reason: Home is the page users constantly see. It must guide the next correct action and avoid wrong-state flicker.


## Correctness queue before visual adoption

The ledger at `96a9624` still carries three `MISSING` functional rows from 13G-C:

- Original bracket coherence after group-score edits.
- Predicted group standings.
- Shared third-place table.

Home Clarity may go first as an explicit decision because it does not depend on those rows. After Home Clarity, these 13G-C correctness rows must be scheduled before Review Picks and before any implementation that consumes predicted tables or the shared third-place presentation.

This is not optional housekeeping. The Groups Tables fast-path and Results Tables tab depend on the same shared predicted/live table presentation and third-place treatment. Implementing visual adoptions before those shared components risks building the same table logic twice and breaking the visual-contract rule that design work must not jump the correctness queue silently.


## Then implement

### Review Picks

Route preference: `/#review`.

Purpose: final Original Predictor completion checklist.

Includes Groups, jokers, Original Bracket, champion/finalists, top scorer, group goals/tiebreak, leagues, lock status, and final confirmation.

### Prediction Trends

Route: `/#prediction-trends`.

Post-lock only. Initial 24–48 hour Home reveal, then More/lower-priority access. Original Predictor first; KO secondary and clearly labelled.

## Prediction Trends live-tournament scope

Prediction Trends starts as a post-lock aggregate prediction snapshot, then becomes a live tournament trends surface from More.

It should answer:

> What did everyone predict, and how are those predictions holding up?

During the group stage, it may show:

- user with most exact scores;
- user with most correct results/outcomes;
- best joker return;
- most predicted group winners still on track;
- most predicted group winners in danger;
- biggest crowd miss so far;
- most successful common prediction;
- average points scored so far;
- how the user compares against the crowd.

During the knockout stage, it remains Original Predictor-first and may show:

- users with most correct Original Bracket teams still alive;
- teams most often still on the correct predicted path;
- teams still alive in the most user brackets;
- most predicted champion still alive;
- most predicted champion eliminated;
- users with most remaining possible Original Bracket points;
- best surviving bracket;
- most damaged brackets;
- common finalist picks still possible;
- common final match-ups still possible;
- top scorer picks still active, if applicable.

KO Predictor trends may appear only as a clearly labelled secondary section, such as KO exact-score leaders, KO result leaders, KO joker return and KO round performance.

### Welcome / Join

Route likely `/#welcome` plus invite/join route/state.

Temporary onboarding surface for first visit, invite landing, first sign-in and guest/account setup.

Invite/join must handle valid, invalid, expired, already joined, league full, signed-out, guest joining, account required, successful join and return to Leagues.

### Activity / Updates

Start light. Possible Home card or More entry. Do not build full notification system yet.

### League Settings / Manage League

Contextual sheet, not permanent nav. Start with safe supported actions.

### Match Centre trends

Useful match-level insights live inside Match Centre. Do not revive old `MatchStats.jsx` as a separate route.

## Support and Privacy

Support and Privacy are required before public signup opens. Public signup remains closed until gates are complete.

## Bottom nav stays fixed

Groups — Bracket/KO — Home — Leagues — More

Do not add new bottom-nav items for Review, Prediction Trends, Welcome, Match Centre, Team Profile, Bracket Health, Activity, Support, Privacy or Settings.
## Future staging/admin data stage — Candidate Team Pool

Suggested stage: `STAGE-CANDIDATE-TEAM-POOL-1`.

Purpose: replace random/fake tester teams with a realistic candidate UEFA team pool for staging, admin setup and later official draw assignment.

This stage should come after the current locked visual-contract recording work and should not leapfrog the correctness queue unless explicitly approved. It is not a public UI confirmation of Euro 2028 participants.

Key model rule: tournament slots and real team identities stay separate. A1–F4 remain the official tournament structure until teams are deliberately assigned.

First pass should inspect current schema/source, confirm whether the candidate pool can be supported without Migration 019, keep official slots unchanged, and document or add the safest candidate-pool source.

## Future staging/admin testing — Admin Scenario Runner

Suggested future stage:

`STAGE-ADMIN-SCENARIO-RUNNER-1`

This stage should come after the locked-contract recording stage and after the immediate correctness/design
queue is consciously sequenced.

Purpose:

- pair fake clock with simulated/fake results;
- simulate to fake-clock time, checkpoint or exact match number;
- allow full tournament lifecycle testing without manual official result entry.

Critical boundary:

- simulated results are not official results;
- normal scoring ignores simulation data;
- fake clock does not create official results;
- reset/clear controls are required;
- no simulated results may pollute real leaderboards, Bracket Health, Prediction Trends or public Results;
- no Migration 019 unless a genuine schema/read-contract gap is proved and Nicky explicitly approves it.

## v7 streamlined grouping

The missing-surface roadmap should now follow the streamlined batch order.

Most individual items are no longer standalone jobs:

| Earlier item | New batch |
|---|---|
| Home Clarity | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Review Picks | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Welcome | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Invite/join states | STAGE-ENTRY-AND-REVIEW-JOURNEY-1 |
| Support | STAGE-MORE-ACCOUNT-TRUST-1 |
| Privacy | STAGE-MORE-ACCOUNT-TRUST-1 |
| More menu final structure | STAGE-MORE-ACCOUNT-TRUST-1 |
| Prediction Trends | STAGE-TOURNAMENT-STORY-SURFACES-1 |
| Activity | STAGE-TOURNAMENT-STORY-SURFACES-1 |
| Match Centre trends | STAGE-TOURNAMENT-STORY-SURFACES-1 |
| League Settings | STAGE-LEAGUE-MANAGEMENT-1 |
| Bracket Health | STAGE-CONTEXTUAL-SURFACES-1 |
| Team Profile | STAGE-CONTEXTUAL-SURFACES-1 |
| Shared States | STAGE-CONTEXTUAL-SURFACES-1 |
| Contextual return | STAGE-CONTEXTUAL-SURFACES-1 |
| Candidate Team Pool | STAGE-CANDIDATE-TEAM-POOL-1 |
| Scenario Runner safety | STAGE-ADMIN-SCENARIO-RUNNER-1 |
| Legacy cleanup | STAGE-LEGACY-REFERENCE-CLEANUP-1 |
| Load/readiness acceptance | STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1 |

## Unresolved predicted group tiebreaker prompt

This is not a standalone missing surface.

It is part resolver rule and part entry/review journey:

- `STAGE-RULES-SCORING-LOCK-1`: resolver and rules record.
- `STAGE-ENTRY-AND-REVIEW-JOURNEY-1`: Groups prompt and Review completion behaviour.

Review Picks must not mark the Original Predictor as complete where a required tied-team order remains
unresolved.

## v9 edge-case additions

The Edge-Case Rules Addendum should be treated as trust/completion behaviour across existing batches.

Do not create separate new pages for these items.

Relevant surfaces:

- Groups prediction flow;
- Review Picks;
- Original Bracket;
- KO Predictor;
- Leagues;
- Match Centre;
- Results;
- Home;
- Admin;
- final readiness acceptance.
