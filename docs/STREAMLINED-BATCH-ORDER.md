# Streamlined Batch Order

## Governing order

```text
0. CONTRACTS-REF-LOCKED-SURFACES-3
1. STAGE-RULES-SCORING-LOCK-1
2. STAGE-ENTRY-AND-REVIEW-JOURNEY-1
3. STAGE-MORE-ACCOUNT-TRUST-1
4. STAGE-TOURNAMENT-STORY-SURFACES-1
4.5. STAGE-RESULTS-AND-SCORING-TRUST-1
4.75. STAGE-ADMIN-OPS-TRUST-1
5. STAGE-LEAGUE-MANAGEMENT-1
6. STAGE-CONTEXTUAL-SURFACES-1
7. STAGE-CANDIDATE-TEAM-POOL-1
8. STAGE-ADMIN-SCENARIO-RUNNER-1
9. STAGE-LEGACY-REFERENCE-CLEANUP-1
10. STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

## Batch 0 — CONTRACTS-REF-LOCKED-SURFACES-3

Record the v6/v7 information into the repo before implementation.

Documentation/reference only.

Do not include:

- product implementation;
- source route changes;
- Supabase changes;
- migrations;
- scoring logic changes;
- fake result writes.

## Batch 1 — STAGE-RULES-SCORING-LOCK-1

Lock rules, scoring and tournament truth before journey work.

Scope:

- Original Predictor scoring;
- KO Predictor scoring;
- group-goals scoring;
- top scorer scoring;
- champion stacking;
- exact-score non-cumulative logic;
- KO method bonus logic;
- provisional API-dependent scoring items;
- How to Play scoring sections;
- tiebreak rules.

This prevents Review, How to Play, Prediction Trends and scoring displays from being built on
moving rules.

## Batch 2 — STAGE-ENTRY-AND-REVIEW-JOURNEY-1

Group Home, Review, Welcome and Invite/Join because they are one entry/completion journey.

Scope:

- Home Clarity;
- Review Picks;
- Welcome / onboarding;
- invite/join entry states;
- no-flicker dynamic state handling;
- progress-aware CTA model.

This replaces a standalone Home-only stage unless Nicky deliberately re-splits it.

## Batch 3 — STAGE-MORE-ACCOUNT-TRUST-1

Group More, Account, Support, Privacy, Settings, About and public-signup trust surfaces.

Scope:

- More menu final structure;
- Support;
- Privacy/Data;
- Settings placement;
- About;
- Account request/delete route;
- public signup gate copy;
- admin-only link visibility.

## Batch 4 — STAGE-TOURNAMENT-STORY-SURFACES-1

Group Prediction Trends, Activity and Match Centre insights because they all answer:
“What is happening in the tournament and what did people predict?”

Scope:

- Prediction Trends;
- Activity / Updates;
- Match Centre trends;
- Player records inside Prediction Trends;
- post-lock prediction snapshot;
- live tournament trend sections.

## Batch 5 — STAGE-LEAGUE-MANAGEMENT-1

Add League Settings / Manage League as a contextual owner sheet/surface.

Start with safe supported actions only.

## Batch 6 — STAGE-CONTEXTUAL-SURFACES-1

Group Bracket Health, Team Profile, Shared States and contextual return.

Scope:

- Bracket Health implementation;
- Team Profile Sheet;
- Shared States;
- contextual return rule implementation;
- Points Breakdown / Player View return behaviour if needed.

## Batch 7 — STAGE-CANDIDATE-TEAM-POOL-1

Data/admin setup and future tournament infrastructure.

Keep official slots stable. Candidate teams remain separate from official slot assignments.

## Batch 8 — STAGE-ADMIN-SCENARIO-RUNNER-1

Safety-critical admin/staging testing tool.

Keep separate from normal product features.

Fake results must never become official results.

## Batch 9 — STAGE-LEGACY-REFERENCE-CLEANUP-1

Retire or quarantine old WC26-era references only after replacements exist.

Also add the one-reference-per-surface audit later.

## Batch 10 — STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1

Final integrated acceptance:

- 250-user / 20-league load check;
- full tournament flow;
- fake clock/scenario validation;
- no-flicker verification;
- Original/KO separation;
- scoring correctness;
- public signup readiness.

## v8 addition — unresolved predicted group tiebreaker

The unresolved predicted group tiebreaker spans two streamlined batches:

### Batch 1 — STAGE-RULES-SCORING-LOCK-1

Record and test the resolver rule:

- only after supported calculable tiebreakers fail;
- predicted group tables only;
- no extra points;
- no real table impact.

### Batch 2 — STAGE-ENTRY-AND-REVIEW-JOURNEY-1

Implement the user flow:

- calm prompt when a completed group still has an unresolved tie;
- two-team choice or multi-team ordering control;
- Review Picks flags unresolved ties;
- Original Predictor is not “fully complete” until required tied-team order choices are made;
- after lock, selected order is read-only.

## v9 addition — edge-case rules addendum

The edge-case rules are placed into existing batches, not new stages.

### Batch 1 — STAGE-RULES-SCORING-LOCK-1

Add:

- in-group unresolved tiebreaker resolver rule;
- best third-place resolver rule;
- group goals auto-calculated only;
- KO Predictor edge-case scoring examples;
- non-standard match-state scoring rules.

### Batch 2 — STAGE-ENTRY-AND-REVIEW-JOURNEY-1

Add:

- user prompts for unresolved in-group ties;
- user prompts for unresolved third-place ties;
- bracket invalidation after group-score edits;
- joker confirmation modal;
- group goals calculated display in Review;
- locked prediction snapshot.


### Batch 4.5 — STAGE-RESULTS-AND-SCORING-TRUST-1

Add:

- results status wording;
- scoring explanation;
- correction/recalculation wording;
- why did I get these points? clarity;
- Original vs KO points separation;
- admin result-entry trust copy;
- pending/delayed/postponed/suspended/abandoned/replay states;
- leaderboard freshness wording;
- fake/simulated result separation.

### Batch 5 — STAGE-LEAGUE-MANAGEMENT-1

Add:

- joining a league after lock should not remove valid pre-deadline prediction points;
- show clear explanatory copy where relevant.

### Batch 10 — STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1

Add:

- delayed/postponed/suspended/abandoned/replay/result-pending match-state acceptance;
- no scoring until official result state is valid.

## STAGE-RULES-SCORING-LOCK-1 outcome

Batch 1 is now recorded as the locked product rules/scoring target.

It locks:

- Original Predictor scoring values;
- KO Predictor scoring values and edge-case examples;
- group goals auto-calculated only;
- unresolved in-group tiebreaker resolver rule;
- best third-place resolver rule;
- final tied-rank display rules;
- delayed/postponed/suspended/abandoned/replay/result-pending match-state scoring rules;
- How to Play wording target.

Implementation of user prompts and Review completion remains Batch 2: `STAGE-ENTRY-AND-REVIEW-JOURNEY-1`.

Any runtime scoring/config alignment needed to make the locked contract live must be explicit and must not be hidden inside unrelated UI work.

Migration 019 boundary marker for STAGE-RULES-SCORING-LOCK-1: active migrations remain 18 and Migration 019 is not created.


## Batch 2 detail — STAGE-ENTRY-AND-REVIEW-JOURNEY-1

Locked contract now recorded in `docs/STAGE-ENTRY-AND-REVIEW-JOURNEY-1.md` and `docs/ENTRY-AND-REVIEW-JOURNEY-CONTRACT.md`.

Implementation must cover Home clarity, Review Picks, Welcome, Invite/Join, no wrong-state flicker, progress-aware CTA model, auto-calculated group-goals display, unresolved in-group tiebreaker prompt, best-third prompt, bracket invalidation, joker confirmation and locked prediction snapshot.

Migration 019 remains unapproved unless a real schema/read-contract gap is proved and approved.

STAGE-MORE-ACCOUNT-TRUST-1 marker record: Support route/content; admin-only link visibility; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.

### STAGE-LEAGUE-SETUP-AND-INVITES-1 — League Setup and Invites contract

Recorded after `STAGE-MORE-ACCOUNT-TRUST-1` as the governing contract for the create league flow, join league flow, invite-code states, invalid/expired/full league states, league privacy explanation, empty league states, member list clarity, post-signup/post-login league continuation and league share/invite copy.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, league membership writes, scoring, resolver, result-entry or migrations. Active migrations remain 18 and Migration 019 is not created.

Public signup remains closed until implementation gates are complete. Join codes do not bypass signup/auth gates, joining a league after lock should not remove valid pre-deadline prediction points, and league membership does not combine Original and KO points.

Implementation must use `docs/LEAGUE-SETUP-AND-INVITES-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor standings as separate competitions, and cover all invite-code states before claiming the flow complete.

STAGE-LEAGUE-SETUP-AND-INVITES-1 marker record: create league flow; join league flow; invite-code states; invalid/expired/full league states; league privacy explanation; post-signup/post-login league continuation; league share/invite copy; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.



### STAGE-RESULTS-AND-SCORING-TRUST-1 — Results and Scoring Trust contract

Recorded after `STAGE-LEAGUE-SETUP-AND-INVITES-1` as the governing contract for results status wording, scoring explanation, correction/recalculation wording, why did I get these points? clarity, Original vs KO points separation, admin result-entry trust copy, pending/delayed/postponed/suspended/abandoned/replay states, leaderboard freshness wording and fake/simulated result separation.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

Public signup remains closed until implementation gates are complete. Result surfaces must not imply final points before official confirmation/recalculation, and simulated results must never be confused with real official results or award real points.

Implementation must use `docs/RESULTS-AND-SCORING-TRUST-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor points as separate competitions, and cover all non-standard match states before claiming the flow complete.

STAGE-RESULTS-AND-SCORING-TRUST-1 marker record: results status wording; scoring explanation; correction/recalculation wording; why did I get these points? clarity; Original vs KO points separation; admin result-entry trust copy; leaderboard freshness wording; fake/simulated result separation; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.


### STAGE-ADMIN-OPS-TRUST-1 — Admin Ops Trust contract

Recorded after `STAGE-RESULTS-AND-SCORING-TRUST-1` as the governing contract for admin control-room trust wording, result-entry guardrails, correction/recalculation audit explanation, fixture schedule/edit trust wording, admin roles explanation, fake/simulated scenario separation, owner-only dangerous action wording, operation history clarity and public/admin trust boundaries.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, fixture writes, result writes, admin-operation writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

Public signup remains closed until implementation gates are complete. Admin Scenario Runner output, fake scores, synthetic seed runs and simulated results must never be confused with official results, never award real points, never pollute production and never write to canonical official results.

Implementation must use `docs/ADMIN-OPS-TRUST-CONTRACT.md` as the target, preserve Original Predictor and KO Predictor as separate competitions, explain admin roles and guardrails clearly, and make dangerous owner-only actions and operation history understandable before claiming the admin operations trust layer complete.

STAGE-ADMIN-OPS-TRUST-1 marker record: admin control-room trust wording; result-entry guardrails; correction/recalculation audit explanation; fixture schedule/edit trust wording; admin roles explanation; fake/simulated scenario separation; owner-only dangerous action wording; operation history clarity; public/admin trust boundaries; Public signup remains closed until implementation gates are complete; Migration 019 remains blocked.

### STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 — Public Signup Implementation Readiness contract

Recorded after `STAGE-ADMIN-OPS-TRUST-1` as the governing contract for public signup gates mapped to owner decisions, email confirmation ON expectations, support/contact-admin flow, 250-user / 20-league capacity guardrails, conservative privacy wording, display-name moderation expectations, low-cost/free hosting assumptions, exact “still closed until implementation” wording and explicit checks before any Auth config change.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

Public signup remains closed until implementation gates are complete. This stage is readiness recording only; it must not be treated as permission to open registration, change Supabase Auth settings or publish a public signup form.

Implementation must use `docs/PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-CONTRACT.md` as the target, preserve email confirmation ON expectations, keep capacity guardrails at 250 users / 20 leagues until explicitly changed, and complete display-name moderation expectations before claiming public signup readiness.

STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-1 marker record: public signup gates mapped to owner decisions; email confirmation ON expectations; support/contact-admin flow; 250-user / 20-league capacity guardrails; conservative privacy wording; display-name moderation expectations; low-cost/free hosting assumptions; exact “still closed until implementation” wording; explicit checks before any Auth config change; public signup remains closed until implementation gates are complete; Migration 019 remains blocked.

