> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Euro 2028 Predictor — Streamlined Remaining Jobs Plan

## Purpose

This document replaces the earlier long job list with a cleaner, grouped plan for the next AI agent.

The project has many good ideas, but some should not be treated as separate isolated jobs because they touch the same files, same routes, same UX flow, or same acceptance logic.

This plan groups related work into sensible batches so the next agent avoids changing the same files repeatedly or creating contradictions.

## Core principle

Do not split work into tiny stages where the same files or same user journey would be edited multiple times.

Group work where:

- the same pages/routes are affected;
- one feature depends on another;
- the same docs/config/copy need updating;
- the same acceptance rules apply;
- implementation needs to stay coherent.

Keep separate work where:

- data safety risk is high;
- admin/staging tools could affect scoring/results;
- database/schema assumptions might be involved;
- legacy deletion needs proof;
- final readiness testing depends on multiple completed features.

---

# Streamlined batch order

Use this order:

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

---

# Batch 0 — Record the v6 docs pack

## Suggested stage name

```text
CONTRACTS-REF-LOCKED-SURFACES-3
```

## Purpose

Record the v6 information pack into the repo before implementation.

This is a documentation/reference recording batch only.

## Include

- v6 locked design documents.
- Home + Missing Surfaces build brief.
- Candidate Team Pool brief.
- Admin Scenario Runner brief.
- Simulation Safety Guidelines.
- Scoring lock notes.
- Updated decision register / roadmap / ledger / charter.
- Final-design-sweep checklist.
- Approved reference files.
- Missing-surface records.

## Do not include

- product implementation;
- source route changes;
- Supabase changes;
- migrations;
- scoring logic changes;
- fake result writes.

## Why this stays separate

This is the source-of-truth recording step. It should happen before build work so the repo reflects the latest workshop decisions.

---

# Batch 1 — Rules, scoring and tournament truth lock

## Suggested stage name

```text
STAGE-RULES-SCORING-LOCK-1
```

## Why this is combined

Scoring, tiebreaks, group goals, top scorer, KO edge cases and How to Play copy are all connected.

If split, the same config, rules docs, How to Play, Review, scoring display and later Prediction Trends content would be edited multiple times.

## Scope

Lock or record:

- Original Predictor scoring;
- KO Predictor scoring;
- group-goals scoring;
- top scorer scoring;
- champion stacking;
- exact-score non-cumulative logic;
- KO method bonus logic;
- provisional API-dependent scoring items;
- public scoring/rules wording;
- How to Play scoring sections;
- tiebreak rules.

## Confirmed Original Predictor scoring

| Item | Points |
|---|---:|
| Correct group match result | 3 |
| Correct group match score | 5 total, not cumulative |
| Correct exact group position | 2 per team |
| All 4 group positions correct in one group | +5 bonus |
| Correct team in Round of 16 | 8 per team |
| Correct team in Quarter-final | 12 per team |
| Correct team in Semi-final | 15 per team |
| Correct team in Final | 20 per team |
| Correct Champion | +25 bonus |
| Exact group-goals total | 25 |
| Group-goals total within 5 | 15 |
| Group-goals total within 10 | 5 |
| Correct top scorer | 30 |

## Confirmed scoring interpretations

- Correct score and correct result are not cumulative.
- Exact score earns the higher exact-score award only.
- Champion scoring stacks with Final round-reached scoring.
- Correct champion team therefore earns Final points plus Champion bonus.
- Original Predictor and KO Predictor points must never combine.

## Confirmed KO Predictor scoring

| Item | Points |
|---|---:|
| Correct 90-minute score | 10 total, not cumulative |
| Correct advancing team, without exact score | 5 |
| Correct 90-minute result | 5 for draw/advancement edge cases |
| Correct method of advancement | +3, requires correct advancing team |
| Correct first-goal time bracket | +3 provisional |

## Provisional scoring items

Keep provisional/API-dependent:

- 5 points per goal by selected top scorer;
- KO first-goal time bracket +3.

These must only be included if reliable official/API data can confirm them automatically.

Do not create manual admin burdens for API-dependent extras.

## Tiebreaks still to define

Define:

- group table tiebreaks;
- third-place ranking;
- private league tied-rank display;
- final leaderboard tiebreaks;
- Original Predictor tied ranks;
- KO Predictor tied ranks;
- UI display for tied ranks.

## Safety boundaries

- No migration unless explicitly approved.
- No Migration 019 unless a genuine schema/read-contract gap is proved.
- No Original/KO point combining.
- No scoring change hidden inside unrelated feature work.

---

# Batch 2 — Home, Review and Welcome journey

## Suggested stage name

```text
STAGE-ENTRY-AND-REVIEW-JOURNEY-1
```

## Why this is combined

Home, Review, Welcome and Invite/Join are part of the same entry and completion journey.

Home cannot be properly fixed without knowing whether Review and Welcome exist. If Home is done first and Review later, the same CTA logic and routes will likely be edited twice.

## Scope

Combine:

- Home Clarity;
- Review Picks;
- Welcome / onboarding;
- invite/join entry states;
- no-flicker dynamic state handling;
- progress-aware CTA model.

## Home goal

Home should answer:

```text
What should I do now?
```

## Home must do

- Show one Original Predictor countdown only.
- Remove KO Predictor visibility before KO readiness.
- Keep Original Predictor priority above KO Predictor.
- Use progress-aware CTA logic.
- Avoid wrong-state flicker.
- Use neutral loading/skeleton states while canonical state is unknown.
- Support matchday states:
  - before first match;
  - live;
  - between matches;
  - after today’s matches complete;
  - rest day;
  - knockout matchday.
- Include post-lock Prediction Trends card link when relevant.
- Do not treat result corrections as a normal Home feature.

## Home CTA model

| User state | Home primary action |
|---|---|
| No picks started | Start Groups |
| Groups incomplete | Continue Groups |
| Groups complete, bracket incomplete | Continue to Bracket |
| Groups complete, bracket complete, Review incomplete | Review Picks |
| Review complete before lock | You’re ready / View leagues / Join league |
| Original Predictor locked | View your picks / View leagues |
| Tournament live | View today’s matches / View points / View leagues |

## No-flicker rule

Home must not briefly show:

- Start Groups when the user should see Continue Groups;
- Continue Groups when Groups are complete;
- Continue to Bracket when Bracket is complete;
- Review Picks when Review is complete;
- KO Predictor cards before readiness;
- editable prediction CTAs after lock;
- signed-out CTAs for signed-in users;
- guest warnings after guest transfer;
- stale points/rank as if final.

If state is unknown, show a calm loading/skeleton state.

## Review Picks

Preferred route:

```text
/#review
```

Review should answer:

```text
Am I actually finished before the lock?
```

Review should include:

- Groups completion;
- joker usage;
- Original Bracket completion;
- champion/finalists;
- top scorer pick;
- group-goals value;
- any retained tiebreak/bonus picks;
- leagues where picks count;
- lock status;
- Edit Groups / Edit Bracket / Done / Join League actions.

Top scorer should be entered on Review unless a later explicit tournament-picks stage replaces that placement.

Group goals should be auto-calculated from Groups but editable on Review if used.

Review becomes read-only after lock.

## Welcome

Preferred route:

```text
/#welcome
```

Welcome is a temporary first-run / invite / setup surface, not a bottom-nav item.

It should support:

- first visit as guest;
- first sign-in;
- invite entry;
- guest transfer confirmation;
- new account setup.

It should explain:

- predict as guest;
- create account;
- join league;
- start Groups;
- Original Predictor lock;
- KO Predictor as later separate competition.

## Invite / join states

Handle:

- valid invite;
- invalid invite;
- expired invite;
- already joined;
- league full;
- signed-out user;
- guest joining;
- account required;
- successful join;
- safe return to Leagues.

Preserve invite context through sign-in/guest flow.

---

# Batch 3 — More menu and support/account trust surfaces

## Suggested stage name

```text
STAGE-MORE-ACCOUNT-TRUST-1
```

## Why this is combined

Support, Privacy, Settings, About, public-signup readiness and More menu structure all touch the same More/Account navigation area.

Splitting them creates repeated menu churn.

## Scope

Combine:

- More menu final structure;
- Support;
- Privacy/Data;
- Settings placement;
- About;
- Account request/delete route;
- public signup gate copy;
- admin-only link visibility;
- Activity entry if it goes in More.

## More may include

- Rules / How to Play;
- Tournament;
- Results;
- Account;
- Settings;
- Support;
- Privacy;
- Prediction Trends;
- Admin if authorised;
- About;
- maybe Activity.

## Suggested treatment

| Item | Treatment |
|---|---|
| Rules / How to Play | Standalone |
| Tournament | Standalone |
| Results | Standalone or strong destination |
| Account | Standalone |
| Settings | Inside Account |
| Support | Account or More |
| Privacy | Linked from Account, Support, Welcome and signup-adjacent states |
| Prediction Trends | More after post-lock Home reveal |
| Admin | Authorised-only |
| About | Simple More page/sheet |
| Activity | Home card plus More entry, possible standalone later |

## Public signup remains closed

Before public signup opens, complete:

- display-name moderation;
- league-name moderation;
- admin rename powers;
- support/deletion request flow;
- email confirmation verification;
- privacy-region wording;
- capacity/tiers monitoring;
- closed/open signup gate copy;
- abuse fallback / ability to pause signups.

---

# Batch 4 — Prediction Trends, Activity and Match Centre trends

## Suggested stage name

```text
STAGE-TOURNAMENT-STORY-SURFACES-1
```

## Why this is combined

Prediction Trends, Activity and Match Centre insights all answer the same product question:

```text
What is happening in the tournament and what did people predict?
```

They may share aggregate/stat/story logic and should not duplicate copy or calculations.

## Scope

Combine:

- Prediction Trends;
- Activity / Updates;
- Match Centre trends;
- Player records inside Prediction Trends;
- post-lock prediction snapshot;
- live tournament trend sections.

## Prediction Trends

Route:

```text
/#prediction-trends
```

Rules:

- hidden before Original Predictor lock;
- temporary Home card for 24–48 hours after lock;
- permanent More entry after that;
- Original Predictor first;
- KO Predictor secondary and clearly labelled;
- no old `/stats` route revival;
- old Tournament Pulse is reference only.

## Prediction Trends phase 1 — post-lock snapshot

Show:

- most predicted winner;
- top 5 predicted winners;
- most common finalists;
- most common final match-up;
- most predicted top scorer;
- top 10 top scorer picks;
- most predicted group winner for each group;
- average predicted group-stage goals;
- user’s picks versus crowd.

## Prediction Trends phase 2 — group-stage live trends

Show where data allows:

- user with most exact scores;
- user with most correct results/outcomes;
- best joker return;
- predicted group winners still on track;
- predicted group winners in danger;
- biggest crowd miss;
- most successful common prediction;
- average points scored so far;
- user versus crowd.

## Prediction Trends phase 3 — knockout/bracket trends

Keep Original Predictor first.

Show where data allows:

- users with most correct Original Bracket teams still alive;
- teams most often still on correct predicted path;
- teams still alive in most user brackets;
- most predicted champion still alive;
- most predicted champion eliminated;
- users with most remaining possible Original Bracket points;
- best surviving bracket;
- most damaged brackets;
- common finalist picks still possible;
- common final match-ups still possible.

KO Predictor trends may appear only as secondary labelled sections.

## Activity / Updates

Start light. Do not build push/email notification system yet.

Possible items:

- league joined;
- new member joined;
- Original Predictor locked;
- Prediction Trends live;
- KO Predictor opened;
- points updated;
- bracket health changed.

## Match Centre trends

Do not revive old `MatchStats.jsx`.

Add useful insight inside Match Centre:

- prediction split;
- common score;
- joker usage;
- points on the line;
- exact-score/outcome count after result;
- private-league split if privacy rules allow.

---

# Batch 5 — League management and social league flow

## Suggested stage name

```text
STAGE-LEAGUE-MANAGEMENT-1
```

## Why this is separate

Invite entry belongs with the Home/Welcome journey, but league-owner tools belong with Leagues.

## Scope

Add League Settings / Manage League as a contextual owner sheet/surface.

Start with safe supported actions:

- rename league if supported;
- copy invite link/code;
- close/reopen invite if supported;
- view league type;
- view snapshot/lock status.

Defer unless already safely supported:

- remove member;
- transfer owner;
- archive/delete league.

Apply contextual return rules.

---

# Batch 6 — Bracket Health, Team Profile and contextual surfaces

## Suggested stage name

```text
STAGE-CONTEXTUAL-SURFACES-1
```

## Why this is combined

Bracket Health, Team Profile, Shared States and contextual return all govern detail surfaces, sheets and recovery states.

They share the same navigation/recovery rules.

## Scope

Combine:

- Bracket Health implementation;
- Team Profile Sheet;
- Shared States;
- contextual return rule implementation;
- Points Breakdown / Player View return behaviour if needed.

## Bracket Health

- Health tab inside Bracket.
- Original Predictor only.
- Saved bracket vs real/live tournament reality.
- Show alive/impossible/shifted-route picks.
- Show teams still on correct path.
- Show points still available by round.
- Do not mutate saved predictions.
- Do not add KO controls to Original Bracket.
- Do not combine Original and KO points.

## Team Profile Sheet

- Contextual sheet from team labels.
- Use app-owned tournament data only.
- Support provisional/TBC team states.
- No invented squad/player/odds data.
- Return to exact origin.

## Shared States

Implement/apply patterns for:

- loading;
- calm error;
- unknown route;
- invite/join state;
- empty states;
- partial states;
- safe recovery states.

## Contextual return rule

Every contextual route/sheet/modal opened from a known origin must return to that origin.

Examples:

- Match Centre from Home returns to Home.
- Match Centre from Leagues returns to Leagues.
- Player View from league row returns to that league.
- Points Breakdown from Player View returns to that player.
- Team Profile from Match Centre returns to Match Centre.
- Invite handling returns to Leagues.

Do not add extra permanent nav items to solve return paths.

---

# Batch 7 — Candidate Team Pool and draw assignment

## Suggested stage name

```text
STAGE-CANDIDATE-TEAM-POOL-1
```

## Why this is separate

This is data/admin setup and future tournament infrastructure. It should not be mixed into user-facing Home/Review work.

## Scope

- Inspect current team/participant/slot schema.
- Confirm whether candidate pool can be added without Migration 019.
- Keep official slots stable: A1–F4.
- Add realistic candidate UEFA team pool.
- Allow admin assignment to draw slots later.
- Prevent duplicate active slot assignment.
- Make sure assignment updates display identity only.
- Do not rewrite predictions, scores, jokers, bracket picks or Review state.
- Keep candidate teams hidden from public as confirmed participants.
- Normalise `N.Ireland` to `Northern Ireland`.
- Support future tournaments with same slot/team assignment model.

## Candidate teams

Initial realistic testing/admin pool:

```text
Albania
Austria
Belgium
Bosnia and Herzegovina
Croatia
Czech Republic
Denmark
England
Finland
France
Georgia
Germany
Greece
Hungary
Iceland
Israel
Italy
Kosovo
Netherlands
Norway
Poland
Portugal
Republic of Ireland
Romania
Scotland
Serbia
Slovakia
Slovenia
Spain
Sweden
Switzerland
Turkey
Ukraine
Wales
Northern Ireland
```

## Public rule

Candidate teams must not be presented publicly as confirmed Euro 2028 participants before official qualification/draw assignment.

---

# Batch 8 — Admin Scenario Runner and simulation safety

## Suggested stage name

```text
STAGE-ADMIN-SCENARIO-RUNNER-1
```

## Why this is separate

This is powerful and safety-critical. It must not be bundled with normal product features.

## Scope

- Pair fake clock with simulated result controls.
- Simulate to fake-clock time.
- Simulate to checkpoint.
- Simulate to match number.
- Deterministic scenario.
- At least one live-match simulation state.
- Clear/reset simulated results.
- Return to clean pre-results state.
- Simulation status/audit.

## Test coverage goal

Scenario Runner should help test:

- Home;
- Results;
- Match Centre;
- group tables;
- best third-place ranking;
- KO readiness;
- Bracket Health;
- Prediction Trends;
- Leaderboards;
- Player View;
- Points Breakdown.

## Critical safety rules

Fake results must never become official results.

Normal scoring must ignore simulated results.

Fake clock must not create official results.

Simulated results must not:

- award real points;
- pollute real leaderboards;
- alter official Bracket Health;
- alter official Prediction Trends;
- survive into live/official operation where normal scoring can read them;
- touch WC26 production.

If this cannot be guaranteed, Scenario Runner must remain preview-only.

## Required safety controls

- clear source separation;
- possible metadata such as `source = simulation`, `is_simulated = true`, `scenario_id`, `simulation_run_id`;
- clear/reset simulation;
- admin-visible active simulation status;
- pre-launch/live-mode check that fails or warns if simulation state is active;
- no public scoring against fake data unless explicitly in simulation mode.

---

# Batch 9 — Legacy retirement and reference cleanup

## Suggested stage name

```text
STAGE-LEGACY-REFERENCE-CLEANUP-1
```

## Why this happens later

Do not delete legacy ideas before replacement surfaces exist.

For example, old Tournament Pulse should stay as reference until Prediction Trends is built.

## Scope

Combine:

- old WC26 page retirement;
- reference file cleanup;
- one-reference-per-surface audit;
- old route/page checks;
- delete/quarantine only after import proof.

## Old pages/concepts not to revive as-is

| Old page/concept | New Euro treatment |
|---|---|
| `GlobalStats.jsx` / `/stats` | Reframe as `/#prediction-trends` |
| Tournament Pulse | Use as reference for Prediction Trends only |
| `Awards.jsx` | Fold tournament picks into Review and Prediction Trends |
| `MatchStats.jsx` | Fold useful insights into Match Centre |
| `Predictions.jsx` | Use Groups / Bracket / Review |
| `PointsSummary.jsx` | Use Points Breakdown / Player View |
| old `HeadToHead.jsx` | Use active Player View / H2H destination |
| `PublicLeague.jsx` | Re-scope as invite/join states |
| old `Home.jsx` | Keep active HomeDashboard only |

## Reference cleanup

- Ensure exactly one reference file per approved surface.
- Avoid duplicate downloaded filenames.
- Do not rename files during recording unless scoped.
- Add later permanent audit for one-reference-per-surface.
- Preserve byte-exact approved HTML until final sweep is explicitly scoped.

---

# Batch 10 — Load, full tournament simulation and acceptance

## Suggested stage name

```text
STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

## Why this is final

This is where all completed features get tested together.

## Scope

- 250-user / 20-league load check.
- Worst-case league sizes.
- Full tournament flow.
- Fake clock/scenario runner validation.
- Mobile performance.
- No-flicker verification.
- Original/KO separation.
- Scoring correctness.
- Bracket Health correctness.
- Prediction Trends correctness.
- Public signup readiness check.

## Required pages/surfaces to test

- Home;
- Groups;
- Bracket;
- KO Predictor;
- Results;
- Leagues;
- Match Centre;
- Player View;
- H2H;
- Points Breakdown;
- Account;
- Review;
- Prediction Trends;
- Welcome/Join;
- More;
- Support/Privacy;
- Admin Scenario Runner.

---

# What was merged from the old long list

Do not keep these as separate standalone jobs.

| Old job | Better home |
|---|---|
| Home Clarity | Batch 2 |
| Review Picks | Batch 2 |
| Welcome | Batch 2 |
| Invite/join states | Batch 2 |
| Activity | Batch 4 |
| Match Centre trends | Batch 4 |
| Player Records | Batch 4 under Prediction Trends |
| Support | Batch 3 |
| Privacy | Batch 3 |
| More menu final structure | Batch 3 |
| Public signup gates | Batch 3, with later signup-open stage if needed |
| Contextual return | Batch 6 |
| Shared States | Batch 6 |
| Team Profile | Batch 6 |
| Bracket Health | Batch 6 |
| Reference file cleanup | Batch 9 |
| Legacy retirement | Batch 9 |
| Load acceptance | Batch 10 |
| Scenario Runner safety | Batch 8 |
| Candidate team assignment | Batch 7 |

---

# Why this structure is better

## 1. Home + Review + Welcome + Invite are combined

Home CTA logic depends on Review and Welcome routes.

Doing them separately would likely cause repeated Home edits.

## 2. Prediction Trends + Activity + Match Centre trends are combined

They all use tournament story/aggregate logic.

Combining them reduces duplicated stat/copy work.

## 3. Support + Privacy + More + Account are combined

They all touch More/Account and public signup readiness.

Combining them avoids repeated navigation churn.

## 4. Bracket Health + Team Profile + Shared States + Contextual Return are combined

They are all contextual surfaces and share return/recovery rules.

## 5. Legacy cleanup happens after replacements

Useful old ideas should not be deleted before their new Euro replacements exist.

## 6. Admin Scenario Runner stays separate

It is safety-critical and must not be bundled into normal user-facing work.

## 7. Candidate Team Pool stays separate

It affects tournament data/admin setup and should not be mixed with UI journey work.

---

# Final recommendation

The best practical order is:

```text
0. Record v6 docs pack.
1. Lock rules/scoring/tiebreaks.
2. Build Home + Review + Welcome/Join journey.
3. Build More + Account trust/support/privacy.
4. Build Prediction Trends + Activity + Match Centre trends.
5. Build League Settings.
6. Build Bracket Health + Team Profile + contextual/shared states.
7. Add Candidate Team Pool.
8. Add Admin Scenario Runner with strict simulation safety.
9. Retire legacy/reference duplication.
10. Run full tournament readiness acceptance.
```

The biggest immediate visible improvement is still Batch 2.

The biggest safety-critical future work is Batch 1, Batch 7 and Batch 8.
