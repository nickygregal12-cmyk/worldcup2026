> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# Decision Register update draft — locked set v5

## Visual contracts locked

Record that the following contracts are confirmed/approved and should be treated as binding visual/interaction references once installed in the reference library:

- Home B.
- Match Centre A.
- Player View A.
- Points Breakdown A.
- Account B.
- Tournament Overview A.
- How to Play / Rules Hub A.
- Admin Control Room A.
- Results.
- Leaderboards.
- Offline Player Claim.
- Bracket Health.
- Team Profile Sheet.
- Shared States.

## Results / Leaderboards separation

Results and Leaderboards are separate destinations.

Results is official/live data only. It has three tabs:

- Groups.
- Tables.
- Knockouts.

Every result opens Match Centre.

The Results Knockouts tab uses live official results, canonical resolver and third-place allocator reuse. It must move from live projection to confirmed tie to real full-time result once played. It must never blend with predicted brackets.

Leaderboards is the player standings destination. Original and KO Predictor standings remain separate through a toggle and are never combined. Every player row opens Player View.

## Final standings tie-break ladders

The confirmed tie-break ladders must be recorded in the Register. These apply to final standings only, not live shared positions during the tournament.

Original Predictor final standings order:

1. closest total goals;
2. most exact group-stage scores;
3. most correct group-stage results/outcomes;
4. knockout accuracy cascade;
5. shared position if still tied.

KO Predictor final standings order:

1. most exact KO scorelines;
2. most correct KO outcomes;
3. shared position if still tied.

Rationale: live standings can show shared positions while the tournament is moving; final standings need a clear published ladder that rewards broad tournament accuracy before leaving a tie shared. Original and KO Predictor remain separate and use their own competition-specific ladders.

## Offline Player Claim

Offline Player Claim is approved.

Claiming is code-based via the league admin, one-way, and transfers ownership while preserving predictions, jokers, points and history. After claiming, only the player edits their own predictions. The pre-claim read-only preview strip is approved.

## Bracket Health

Bracket Health is approved as a Health tab inside the Bracket page, not as a standalone bottom-nav or main destination.

It shows a user’s predicted bracket against the real/live tournament route:

- on your path;
- alive on a different path;
- teams meeting early / route conflict;
- out;
- points still available by round.

It must not alter saved predictions, rewrite the bracket, combine Original/KO points or add KO controls to Original Bracket.

## Team Profile Sheet

Team Profile Sheet is approved.

It should use objective, low-maintenance information only:

- curated facts such as FIFA ranking, qualifying route and best Euro finish;
- computed live data such as group position, tournament record and next fixture;
- optional editorial note only if already supported;
- community expectation stats after the prediction lock only.

It must not include squad lists, player names or odds.

## Shared States

Shared States is approved for:

- More menu;
- shimmer loading, never spinners;
- calm error with retry;
- unknown route recovery;
- invite/join code treatment;
- privacy placeholders.

## Home Clarity

Home must answer: What should I do now?

Before the tournament, Home should show one main countdown: Original Predictor locks when the first match kicks off.

Home must show zero KO Predictor presence before KO Predictor readiness.

Home primary CTA follows Original Predictor progress:

- Start Groups.
- Continue Groups.
- Continue to Bracket.
- Review Picks.
- You’re ready / View leagues / Join league.
- View your picks / View leagues.
- View today’s matches / View points / View leagues.

Home matchdays order rows: live → upcoming → finished. Match rows open Match Centre.

Home must not flash wrong state while account, guest, lock, completion or fixture state is resolving.

## Correctness queue sequencing

Home Clarity may be implemented first as a conscious easy-win decision because it does not depend on the open 13G-C correctness rows. After Home Clarity, the recorded 13G-C missing functional rows must re-enter the queue before Review Picks and before dependent visual adoptions:

- Original bracket coherence after group-score edits.
- Predicted group standings.
- Shared third-place table.

This avoids silently letting visual/reference work overtake correctness work.

## Result correction rule

Matches should not normally need corrected.

Result correction should not be treated as a planned everyday Home feature.

Correction handling may still exist as an admin/internal safety fallback, but Home should not promote “result corrected” as normal content.

Only if an exceptional correction has genuinely happened and affected visible points should the app calmly explain it in the most relevant place, such as Results, Match Centre or Points Breakdown.

Home does not need a standing result-correction card.

## Review Picks

Review Picks is needed, preferably at `/#review`.

It is the final Original Predictor completion checklist for Groups, jokers, Original Bracket, champion/finalists, top scorer, group goals/tiebreak, leagues and lock state.

After lock, Review is read-only.

## Prediction Trends

Prediction Trends is approved at `/#prediction-trends`.

It appears only after Original Predictor lock. It starts as a post-lock aggregate prediction snapshot and evolves into live tournament trends.

Do not revive old `/stats` or old Tournament Pulse routes without explicit approval.

Original Predictor trends remain primary. KO Predictor trends may be shown only as a clearly labelled secondary section.

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

## Welcome / onboarding

Welcome is needed, likely at `/#welcome`, as a temporary entry/setup surface. It can appear on first visit, first sign-in, invite entry, guest transfer confirmation or new account setup.

It is not a permanent main-nav page.

## Invite / join league states

Invite/join must handle valid, invalid, expired, already joined, league full, signed-out, guest joining, account required, successful join and safe return to Leagues.

## League Settings / Manage League

League Settings / Manage League is likely needed as a contextual sheet. Start only with safe supported owner actions.

## Activity / Updates

Activity is useful but should start light. It may be a Home card, More entry or later route. No push notifications or email digests unless separately scoped.

## Match Centre trends

Do not revive old `MatchStats.jsx` as a separate route. Useful match insights should live inside Match Centre.

## Tournament Picks placement

Do not revive old `Awards.jsx` directly.

Tournament-wide picks should be handled through Review Picks before lock, Prediction Trends immediately after lock, Prediction Trends/Tournament during the tournament and Prediction Trends archive after the tournament.

## Support and Privacy

Support and Privacy are required before public signup opens. Public signup remains closed until gates are implemented and approved.

## Old WC26 surfaces not to revive as-is

Record the mapping:

- `GlobalStats.jsx` / `/stats` → `/#prediction-trends`.
- Tournament Pulse → reference only for Prediction Trends.
- `Awards.jsx` → Review and Prediction Trends.
- `MatchStats.jsx` → Match Centre insights.
- `Predictions.jsx` → Groups / Bracket / Review.
- `PointsSummary.jsx` → Points Breakdown / Player View.
- old `HeadToHead.jsx` → active Player View / H2H destination.
- `PublicLeague.jsx` → invite/join states.
- old `Home.jsx` → keep active HomeDashboard only.
## Candidate Team Pool and Draw Slot Assignment

Decision to record as a future staging/admin data model proposal:

- Official Euro 2028 tournament structure remains slot-based until the real draw is known.
- Candidate teams are separate from draw slots and are used for staging/admin/testing unless explicitly approved for public display.
- Slot assignment is an admin action that maps a candidate/qualified team to an official slot such as A1 or F4.
- Assigning a team to a slot must update display identity only and must not rewrite user predictions, scores, jokers, bracket picks or Review state.
- Public UI must not describe candidate teams as confirmed Euro 2028 participants before official qualification/draw assignment.
- Duplicate active assignment of the same team to two Euro 2028 slots must be prevented or the risk explicitly documented.
- No Migration 019 is approved. A future implementation must first prove whether the current schema/read contracts can support the pool and assignment workflow.

Suggested future stage: `STAGE-CANDIDATE-TEAM-POOL-1`.

## Decision — Admin Scenario Runner and simulation safety

The app should eventually have an Admin Scenario Runner paired with the fake clock.

The fake clock controls perceived tournament time. The Scenario Runner controls simulated results for
testing.

The Scenario Runner is for staging/testing only and must be separate from official result entry.

Binding safety rule:

> Fake clock + fake scores can simulate the tournament for testing, but they must never become the
> official result source of truth.

Recorded boundaries:

- official results and simulated results must never share an ambiguous state;
- simulated results must be clearly marked or namespaced;
- normal scoring must ignore simulated results unless the whole app is explicitly in simulation/test mode;
- fake clock must not create official results or award real points;
- simulated results must be clearable without changing user predictions, official results, accounts,
  league membership or configuration;
- pre-launch/live-mode checks should warn or fail if simulated results are present in official mode;
- WC26 production remains fail-closed;
- no Migration 019 is approved unless a genuine schema/read-contract gap is proved and Nicky explicitly
  approves it.

Recommended future stage:

`STAGE-ADMIN-SCENARIO-RUNNER-1`

## Decision — streamlined remaining-jobs grouping

The remaining work should be grouped into coherent batches, not split into many tiny stages that edit the
same files or journeys repeatedly.

Accepted batch order:

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

Rationale:

- Home, Review, Welcome and Invite/Join are one entry/completion journey.
- Prediction Trends, Activity and Match Centre trends share tournament story/aggregate logic.
- More, Account, Support and Privacy share trust/navigation surfaces.
- Bracket Health, Team Profile, Shared States and Contextual Return are contextual surface work.
- Candidate Team Pool and Admin Scenario Runner remain separate because they are data/safety-critical.
- Legacy cleanup happens after replacements exist.

## Decision — unresolved predicted group tiebreaker prompt

When a user completes all score predictions in a group, the app calculates the predicted group table using
all supported score-derived tiebreakers.

If two or more teams remain tied on every tiebreaker the app can calculate from the user's score
predictions, the app must ask the user to choose the intended order of those tied teams.

This selected order is used only after all supported calculable tiebreakers fail.

It must not:

- override normal calculable tiebreakers;
- award extra points;
- create a public fair-play prediction;
- alter real official result tables;
- apply where the app can determine order from score-based rules.

Review Picks must flag unresolved tied-team ordering and must not show the Original Predictor as fully
complete while such a choice is still required.

Before lock, the user may change the selected tied order if the underlying scores still create the unresolved
tie. After lock, the selected order is read-only. If a score change removes the tie, the manual tied-team
order no longer applies.

Stage placement:

- rules/resolver record: `STAGE-RULES-SCORING-LOCK-1`;
- user flow/review completion: `STAGE-ENTRY-AND-REVIEW-JOURNEY-1`.

## Decision — edge-case rules addendum

The following edge-case rules are locked for future implementation stages:

1. In-group unresolved tiebreaker prompts must offer Change scores or Pick positions.
2. Best third-place resolver prompts must offer Change scores or Pick positions where unresolved ties affect qualification or bracket placement.
3. If group-score edits alter predicted qualifiers or bracket paths, the Original Bracket must be marked for review rather than silently keeping stale picks.
4. Applying a group-stage or KO Predictor joker should use a confirmation modal that explains the doubling effect and remaining allowance.
5. Group goals must be auto-calculated only from the 36 predicted group match scores. They are not manually editable.
6. At Original Predictor lock, the app should preserve a clear locked snapshot of the user's submitted predictions.
7. Joining a league after lock should not remove or reduce valid points if the user's predictions were submitted before the deadline.
8. KO Predictor scoring must have explicit example rows before implementation.
9. Delayed, postponed, suspended, abandoned, replay-required and result-pending match states should be handled calmly and should not score until the official result state is valid.

Main principles:

- When the app cannot calculate the user's intended order from scores alone, it should ask the user rather than silently choosing.
- The user's locked prediction state should be auditable after the deadline.
