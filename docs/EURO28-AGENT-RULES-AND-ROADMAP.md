# EURO 2028 PREDICTOR
## Agent Rules and Functional-Completion Roadmap
### Version 4.35 — Approved visual anchors recorded

> **Authority:** The Decision Register governs product rules. The Design Charter governs presentation and frontend architecture. The Functional Completion Ledger governs actual state. This document governs process and sequence.

## 1. Non-negotiable working rules

- Work only in `~/Desktop/euro28predictor` on `euro28-development`.
- Never modify, merge into or target `main`.
- Permitted Supabase project: `gcfdwobpnanjchcnvdco` only.
- Blocked WC26 project: `ouhxawizadnwrhrjppld`.
- No `sudo`, `git add .`, `npm audit fix --force` or linked database reset.
- No secret values in code, packages, chat or committed files.
- Exact manifests, per-file checksums, ZIP checksum and guarded installation commands are mandatory.
- Give one numbered installation step at a time.
- Do not claim acceptance without Nicky's Terminal evidence.
- Original and KO Predictor points never combine.
- Predicted and live brackets never blend.
- Migration 018 is applied and aligned locally and on Euro staging. Stage 13F-K3 is acceptance/tooling only and must retain exactly 18 migrations with no Migration 019.
- Every batch updates the Functional Completion Ledger in the same commit.



## CONTRACTS-REF-LOCKED-SURFACES-3 — v9 sequencing and safety rules

The v9 package is now recorded in live docs. Future work must follow the grouped remaining-batch order unless Nicky explicitly re-sequences it:

```text
0. CONTRACTS-REF-LOCKED-SURFACES-3
1. STAGE-RULES-SCORING-LOCK-1
2. STAGE-ENTRY-AND-REVIEW-JOURNEY-1
3. STAGE-MORE-ACCOUNT-TRUST-1
4. STAGE-LEAGUE-SETUP-AND-INVITES-1
5. STAGE-TOURNAMENT-STORY-SURFACES-1
6. STAGE-LEAGUE-MANAGEMENT-1
7. STAGE-CONTEXTUAL-SURFACES-1
8. STAGE-CANDIDATE-TEAM-POOL-1
9. STAGE-ADMIN-SCENARIO-RUNNER-1
10. STAGE-LEGACY-REFERENCE-CLEANUP-1
11. STAGE-TOURNAMENT-READINESS-ACCEPTANCE-1
```

Do not split work into tiny stages where the same files, routes or journeys are repeatedly edited.

Carry-forward rules:

- All new pages must use the approved Euro 2028 design system and the installed reference prototypes.
- Dynamic pages must not show wrong-state flicker. Use neutral shimmer/skeleton states where canonical state is unknown.
- Contextual routes, sheets, modals and detail surfaces opened from a known origin must provide a clear return to that origin.
- Results and Leaderboards are separate. Results is official/live data; Leaderboards is standings.
- Bracket Health is approved as a Health tab inside Bracket only.
- Group goals are auto-calculated only. Do not implement manual group-goals editing unless Nicky explicitly reopens the decision.
- Unresolved predicted group and best-third-place ties must prompt only after supported calculable score-derived tiebreakers fail. They award no extra points and do not alter official tables.
- Candidate teams are not confirmed public participants until officially qualified/drawn and deliberately assigned.
- Fake clock plus fake scores must never become the official result source of truth. If simulation source separation cannot be guaranteed, Scenario Runner must remain preview-only.


## 2. Completion rule

A stage closes only when every approved ledger row in its scope is:

- ✅ FUNCTIONAL;
- 🚫 REJECTED; or
- explicitly transferred to a later approved stage.

Implemented, deployed or documented are not substitutes for functional acceptance.

## 3. Current accepted foundation

- Stages 1–12: backend and operations implemented.
- Stage 13A: shell/design foundation implemented; architecture enforcement omission assigned to Stage 14B.
- Stage 13B: Groups Predictor accepted.
- Stage 13C: Original Bracket and separate KO Predictor accepted.
- Stage 13D: implementation complete; coherent H2H and real multi-user/clock acceptance incomplete.
- Stage 13E: Team Profile Sheet accepted.
- Stage 14: observability and resilience accepted at `d522210`, 15 migrations.
- Stage 14B Batch 1: architecture governance gates accepted at `66adb1f`; 59 test files and 321 tests passed.
- Stage 14B Batch 2: structural compliance accepted at `8e11edd`; all active JSX files are within the 400-line hard cap and 59 test files / 321 tests passed.
- Stage 14B Batch 3: contrast completion accepted at `7261888`; all 58 registered token pairs pass with zero exceptions and 59 test files / 321 tests passed.
- Stage 13F-0: site-wide information architecture and direct leaderboard access accepted at `51696c3`.
- Stage 13F-A: guest Original/KO persistence, safe account transfer, signup prompts and Lucky Dip accepted at `2e2b9a8`; 63 test files and 333 tests passed.
- Stage 13F-B: shared player identity and complete Original/KO H2H accepted at `4b81fb1`.
- Stage 13F-C: Euro Match Centre accepted at `b1b9879`.
- Stage 13F-D: immutable Original Bracket Health accepted at `4532b99`.
- Stage 13F-E: Admin invisibility accepted at `8349e83`.
- Stage 13F-F: presentation accepted at `369ddfc`, but its section-navigation claim is retrospectively corrected by Stage 13G-R0 because the audit did not render or click destinations.
- Stage 13F-G: audited staging Time & Phase accepted at `7324d43`; Migration 016 applied.
- Stage 13F-H: product-root and runtime coherence accepted at `74c8dd3`; 70 test files and 352 tests passed.
- Stage 13F-I: Original-only tournament-pick contract accepted at `63d7acb`.
- Stage 13F-J: player insight and points storytelling accepted at `f7f2fb5`; Migration 017 applied; 74 test files and 363 tests passed.
- Stage 13F-K0/K1: Admin scope and Migration 018 database contract accepted through `0e4d5b7`; 18 migrations are aligned and 50 local plus 50 linked pgTAP tests passed.
- Stage 13F-K2: Euro control-room implementation accepted at `c4342f1`; 78 test files and 376 tests passed, all six responsive theme baselines were accepted and deployed verification passed.
- Stage 13F-K3 and Stage 13G-A/B/C/H docs/tooling/product-alignment packages are recorded through the current ledger; the latest known completed product commit before Stage 16A-S0 is `8ee70ec Compact Stage 13G league shell`.
- Stage 16A-S0 is recorded as a scope-alignment package. Stage 13G-MATCH-CENTRE-REF is the current accepted docs/audit-only checkpoint for Match Centre group-fixture behaviour; active migrations remain 18 and no Migration 019 is created.

# Delivery sequence

## Stage 14B — Architecture enforcement

### Batch 1 — governance and ratcheted audits — ACCEPTED AT `66adb1f`

- restore Charter Section 11;
- introduce exact component/global-style caps;
- enforce dependency direction and WC26 quarantine;
- freeze current fixture-import debt;
- add light/dark token contrast calculations;
- record current contrast failures as exact non-regression exceptions;
- add the Functional Completion Ledger and rebuilt roadmap.

### Batch 2 — structural compliance — ACCEPTED AT `8e11edd`

- split `LeaguesFoundation.jsx` into a 399-line controller and 245-line presentation module;
- split `PredictionJourneyFoundation.jsx` into a 327-line controller, 208-line view and 41-line runtime helper;
- split `ResultsAndLeaderboardsFoundation.jsx` into a 165-line controller and 280-line presentation module;
- remove all three temporary component caps;
- update feature audits to inspect the complete split feature rather than one historical file;
- preserve existing class names, styling, behaviour and visual baselines;
- defer style ownership migration because no styling was materially changed and all global compatibility ceilings remain frozen.

### Batch 3 — contrast completion — ACCEPTED AT `7261888`

- darken the light-theme muted-text token from `#718096` to `#627085`;
- darken the light-theme joker token from `#a66b00` to `#9c6500`;
- remove all four temporary contrast exceptions;
- preserve the dark theme, layout, selectors and feature behaviour;
- close Stage 14B once the owner acceptance gate passes.

Stage 14B ends with no oversized active UI component and no contrast exception.

## Stage 13F-0 — Site-wide information architecture and access contract — ACCEPTED AT `51696c3`

### Accepted scope

- dedicated `#/leaderboards` route rather than a Results alias;
- Results owns fixture/result feed, live tables and live bracket;
- Leaderboards owns full Original/KO tables and matching points;
- competition-specific Home deep links;
- Leaderboards in More without changing the five-position mobile navigation;
- permanent `EURO28-SITE-ACCESS-MAP.md`;
- `audit:access` enforcement;
- corrected Project Constitution adoption.

Admin invisibility remains Stage 13F-E and is explicitly not claimed complete here. Future H2H, Match Centre and Bracket Health entry rules are recorded now and implemented in their owning stages.

## Stage 13F-A — Guest journey and Lucky Dip — ACCEPTED AT `2e2b9a8`

### Implementation scope

- preserve the existing Groups and Original Bracket browser draft;
- add separate browser persistence for available KO Predictor fixtures;
- continue an unfinished browser Original draft after sign-in rather than replacing it with an empty account workspace;
- offer one safe account action for eligible Original and KO browser entries;
- never overwrite existing account predictions;
- clear each browser copy only after its matching controlled account save succeeds;
- add progress-aware signup prompts without repeated nagging;
- remove ordinary JSON import/export controls from the live journey;
- add Euro-native fill-empty and confirmed replace-all Lucky Dip modes;
- preserve jokers and clear bracket picks made stale by changed group tables;
- use no odds, rankings, WC26 code or database change.

### Completion gate

All five guest ledger rows move together: KO persistence, transfer, signup encouragement, JSON-control removal and Lucky Dip. Stage 13F-A is not complete if any one remains partial or inaccessible.

## Stage 13F-B — Player identity and complete H2H

- add one reusable `PlayerIdentity` primitive to the shared design system;
- replace ad hoc league and overall player-name buttons with that primitive;
- use one shared H2H surface from both league and overall entry points;
- show selected-competition rank and points for both players;
- align all 36 Original group matches and all 15 Original bracket positions;
- align all 15 KO Predictor real-fixture positions;
- render same, different, protected and not-saved states side by side;
- preserve the existing Original global-lock and KO fixture-start privacy rules;
- keep Original and KO Predictor totals separate;
- add no database change or Migration 016.

### Completion gate

Both ledger rows move together: player identity and H2H comparison. Stage 13F-B is not complete if league and overall use different interaction or presentation paths, if either competition is only partially aligned, or if privacy is inferred client-side.

## Stage 13F-C — Euro Match Centre

- dedicated per-fixture route with previous and next navigation;
- canonical fixture/result state, unresolved participants and corrected-result context;
- direct entry from Home and every Results row;
- separate Original Predictor and KO Predictor tabs;
- Overall and private-league scope selection;
- privacy-safe community distribution from released predictions only;
- sortable points-on-the-line rows with player identity, rank, current points, saved selection, joker and maximum available points;
- signed-out, loading, empty, private, not-saved, partial and error states;
- no odds or weather;
- no WC26 MatchStats reuse;
- no new RPC, data model, migration or scoring invariant.

### Completion gate

The route, canonical fixture state, direct entry points, competition separation, scope selection, community summary and player impact rows move together. Existing server-authorised privacy gates remain authoritative.

## Stage 13F-D — Original Bracket Health

- round-by-round bracket-health navigation;
- alive, eliminated and guaranteed-loss predicted teams;
- secured and maximum remaining bracket points;
- exact matchup still possible, partially alive or lost;
- saved winner still alive where an exact fixture route has changed;
- route-conflict explanations when predicted teams must meet early;
- completed-result survival cards in plain English;
- the locked prediction remains immutable and is never rewritten by results;
- when both real participants are canonically known, the real fixture becomes the comparison context while the original pick remains visible;
- every known real knockout fixture links to Match Centre for league and points impact;
- unresolved future fixtures continue to show the user’s original predicted matchup;
- Original and live bracket states remain independently resolved even when displayed together for comparison;
- no new bracket logic, data model, RPC, migration or scoring invariant.

### Completion gate

Prediction immutability, real-fixture comparison, unresolved-original fallback, round health, route conflicts, secured/remaining points and Match Centre access move together. A comparison view must never mutate or masquerade as the saved Original bracket.

## Stage 13F-E — Admin invisibility

- remove Admin from ordinary routes and navigation;
- direct non-admin access resolves generically;
- server authorisation remains unchanged.

## Stage 13F-F — Admin Control Room

**Accepted scope:** responsive visual and operational-layout rebuild only. Preserve all existing server-authorised operations; add no new powers or migration.


- sectioned, phone-usable design-system presentation;
- results, corrections, scoring, controls, grace, profiles, health and audit history;
- presentation only; no RPC or authorisation changes.

## Stage 13F-G — Staging Time & Phase controls

- staging/simulation only;
- immutable seeded baseline plus reversible timestamp offset;
- audit logged;
- hidden and rejected in production;
- never used for Stage 15 staging smoke;
- no irreversible global-lock mutation merely to simulate time.

Any server/data contract requires separate approval.

## Stage 13F-H — Product-root and runtime coherence

- invert the mount so the product shell is the root;
- remove active Foundation naming and development wording;
- remove fixture data from production output;
- remove inherited Netlify handlers from Euro deploy input;
- remove incoherent manifest/push remnants pending Stage 18C;
- retire active transitional global styles except the final frozen WC26 bridge.

## Stage 13F-I — Tournament-pick contract — ACCEPTED AT `63d7acb`

Approved contract:

- Original Predictor only;
- one global tournament lock;
- no joker;
- central versioned scoring contract;
- no standalone Awards page;
- Home live-race presentation and points breakdown integration are implementation work, not part of this contract-only batch;
- total tournament goals: 20 points to every equally nearest prediction;
- top scorer: 20 points when the selected player is among the official joint winners;
- highest-scoring team: 20 points when the selected team is among the joint highest scorers;
- no extra-pick value acts as a tournament tiebreaker;
- the real player selector activates only in Stage 17A when official player data exists;
- no database migration in Stage 13F-I.

### Completion gate

The versioned contract, deterministic scoring helpers, tests, decision register, ledger and roadmap must agree exactly. Database and UI implementation remain scheduled work and must not be claimed functional here.

## Stage 13F-J — Player insight and points storytelling — CURRENT PACKAGE FROM `63d7acb`

- one reusable player-insight model for the signed-in player and authorised visible players;
- rank, total, leader gap, next-higher-score gap and tied-score context;
- canonical Original breakdown for group exact scores, group outcomes, group-joker bonus and Original bracket milestones;
- canonical KO breakdown for 90-minute exact score, 90-minute outcome, advancing team, decision method and KO-joker bonus;
- no group-position category because the accepted Euro contract awards no separate group-position points;
- tournament-pick persistence and player-facing consumption remain Stage 17A;
- exact scores, correct results, successful jokers, processed matches, corrected results, points by matchday/round, best period, scoring streak and highest-scoring call;
- no subjective toughest-call claim and no historical-rank claim without a canonical definition or snapshots;
- expandable canonical match and Original bracket evidence, with Match Centre and bracket context links;
- reuse Stage 13F-B identity/H2H and isolate insight failures so authorised comparison rows remain usable;
- every presented team uses the existing `TeamLabel` provisional-data treatment;
- never combine Original and KO Predictor totals;
- no independent component scoring calculations.

### Approved server contract

Migration 017 adds only the authenticated read RPC `get_player_competition_points`. It reuses the existing Original global-lock and KO fixture-release boundaries, exposes only canonical awarded rows, filters another player’s KO subtotal to released fixtures, adds no browser write and changes no scoring or admin power.

### Completion gate

The Stage 13F-J audit, frontend tests, Migration 017 database test, full repository check, local visual review and owner Terminal evidence must move together. The migration count becomes 17 only after the owner verifies and applies Migration 017 to Euro staging.

## Stage 13F-K — Complete Admin Operations Backbone

Stage 13F-K closes the remaining Euro-native launch/live operations before Stage 13G begins. Existing result entry, corrections, match status, one-match recalculation, global lock, feature controls, grace, Time & Phase, Team Profile curation and audit history remain authoritative.

### Stage 13F-K0 — Scope and server contract — ACCEPTED AT `b6c7ddc`

- approve fixture date/time/venue/schedule-status editing as owner-only;
- approve owner-only replacement reconciliation across the complete tournament;
- approve Migration 018 without creating or applying it in this documents-only batch;
- keep participants, resolver slots, scoring values and manual points outside scope;
- provide one Tournament Picks Admin home now while executable outcomes remain Stage 17A;
- approve the operational-readiness and audit-presentation contract;
- keep active migrations at 17.

### Stage 13F-K1 — Database operations contract — ACCEPTED THROUGH `0e4d5b7`

- add `202607030018_euro28_complete_admin_operations.sql`;
- add optimistic `fixture_revision` and protected venue/fixture read contracts;
- add owner-only fixture update and whole-tournament reconciliation RPCs;
- extend readiness output and append-only event types, while restoring the accepted `team_profile_updated` value omitted by Migration 016;
- prove permissions, conflicts, validation, replacement scoring and Original/KO separation through database tests;
- move to 18 active migrations only after owner-linked staging acceptance.

### Stage 13F-K2 — Euro control-room implementation — ACCEPTED AT `c4342f1`

- fixture operations UI;
- whole-tournament scoring recovery UI;
- Tournament Picks readiness section;
- consolidated readiness presentation;
- filtered expandable audit presentation;
- split Admin components within standing architecture limits;
- responsive light/dark tests and baselines.

### Stage 13F-K3 — Staging acceptance and close-out — CURRENT PACKAGE FROM `c4342f1`

- owner/results-admin permission walkthroughs;
- deployed Admin invisibility and operation verification;
- no real global lock and no invented shared-staging kick-off time;
- full repository and linked-database gates;
- ledger/roadmap close-out before Stage 13G-A.

### Binding server boundary

Migration 018 may add only fixture revision/editing, tournament-venue reads, complete scoring reconciliation, readiness output and two append-only event values. It adds no tournament-pick persistence, official player data, participant assignment, resolver change, scoring-value change, manual point edit, external result API or new Admin role.

### Completion gate

The owner can perform every approved launch and live-tournament operation through the Euro control room without exposing Admin to ordinary users, bypassing audit history, relying on direct table editing or invoking inherited WC26 tooling. Tournament-pick outcome entry remains explicitly scheduled for Stage 17A.

## Stage 13G — Information architecture and coherent UI pass

Stage 13G is one holistic post-functional-completion pass. It is governed by the Project Constitution, Design Charter, Decision Register, Site Access Map and Functional Completion Ledger. Batches are organised by information-architecture area rather than page.

### Stage 13G-0 — IA and scope contract — ACCEPTED AT `efce59f`

- approve the full destination map and ownership of direct/contextual journeys;
- approve the lifecycle-specific More strategy and pre-readiness KO teaser;
- record the hardwired-data inventory with active-file evidence;
- approve the Stage 13G-A through 13G-D batch structure;
- position Stage 13G against Stage 13F-K, Stage 16A and Stage 13P-A;
- approve dynamic per-league preview titles/descriptions using a static Euro image;
- add no product/runtime code, migration or deployed asset; align one stale Stage 13D audit assertion with the already accepted `f7f2fb5` verifier wording.

### Stage 13G-A — Route integrity, central configuration and shared interaction primitives

- one central destination registry;
- grouped phase-aware More sheet;
- deliberate pre-readiness KO explainer and modest Home treatment;
- explicit not-found state;
- corrected Home-to-Results access;
- designed contextual ownership for Match Centre, Team Profile, Player Overview, H2H and Bracket Health.

No migration is expected.

### Stage 13G-B-TOURNAMENT-1 — Tournament / How to Play split

Next-agent checkpoint: Part A is now implemented as a scoped Tournament/How to Play split. `#/tournament` is the football facts destination and `#/how-to-play` is the predictor mechanics destination. Both read from central tournament/scoring config and resolver-derived totals rather than duplicated prose. `TOURNAMENT_CONFIG` records confirmed dates, host nations, venues, Cardiff opener and Wembley final-week facts; group participants and match-specific kick-off times remain unconfirmed. Keep Account, Admin and Match Centre for later focused batches. No Migration 019.

### Stage 13G-B — Tournament comprehension and match organisation

Accepted Home/lifecycle slice from `08524b6` adds first-visit/returning guest copy, central-config countdowns, a Today’s match hub, Home KO-readiness signal and a build audit. Remaining Stage 13G-B work stays scoped to match organisation and tournament comprehension.

- real-time chronological match ordering;
- By group and By date group-stage views using shared match components;
- By group default before the opening match and By date default once play starts, while respecting manual choice;
- split Tournament and How to Play into separate More/footer destinations;
- next scoped implementation: `13G-B-TOURNAMENT-1 — Tournament / How to Play split and canonical tournament fact correction`;
- all binding rules and values rendered from versioned configuration/contracts;
- remove active development-era hardwired counts, stages, dates and stale environment copy;
- replace inherited WC26 share/favicon/icon assets with Euro identity assets.

No migration is expected.

### Stage 13G-C — People, profiles and sharing

- every player name uses one shared activation primitive;
- one authorised player overview owns predictions, Original bracket, separate points stories and H2H;
- one-tap league invite links with confirmation state;
- static Open Graph preview minimum and approved dynamic per-league title/description;
- prepare privacy-safe synthetic identity output for Stage 16A.

Any narrow read-contract migration for `is_synthetic` or invite-safe metadata must be proved and separately approved.

### Stage 13G-D — Seeded proof and whole-surface coherence

- consume the Stage 16A seeded cast;
- populate Scotland through the completed Admin curation workflow;
- document the Stage 17 procedure for the other 23 teams;
- exercise every lifecycle-specific More state, player context and invite preview;
- re-baseline every active screen in both themes;
- complete the screen-by-screen charter review and owner new-player walk-through.

Stage 13G-D and Stage 16A close in the same evidence window but move their ledger rows independently.


### Stage 13G test strategy extension — APPROVED AFTER R0

This extension is a binding roadmap amendment. It is recorded before Stage 13G-A product work so the Stage 13F-F failure class cannot recur. Implement it incrementally, not as test gold-plating.

1. **Route-render integration tests — Stage 13G-A and then every destination batch.** Render the real shell at each route and section hash with Vitest and Testing Library and assert the rendered content, not only the URL. Cover every current destination, including every Admin section. Every new destination must ship with one route-render test. Add a dead-destination audit so every internal link target resolves against the route table and fails the build when it does not.
2. **Permission matrix pgTAP suite — next database/protected-operation batch.** Add one systematic allow/deny matrix for every RPC and protected table across anonymous, authenticated non-owner, owner and admin roles. New database objects must add their matrix rows and the suite must fail on unmapped objects.
3. **Invariant tests — Stage 13G-C and scoring/resolver batches.** Prove scoring recalculation idempotence, where identical input produces identical stored results when run twice. Add resolver property tests so random valid group results always produce a lawful bracket with all slots filled, thirds drawn only from their qualified combination and no duplicate teams.
4. **Lock-boundary suite — Stage 13G-A/B/C as lock and countdown surfaces land.** Use the shared clock utility to assert behaviour at the exact global lock instant, joker kick-off second and grace-expiry mid-operation, checking both sides of each boundary.
5. **Config-to-surface contract tests — Stage 13G-B/C.** Assert displayed scoring values equal the central ruleset, countdowns equal central configuration and Home, leagues and navigation all derive KO readiness from the one central signal.

Explicitly out of scope for this roadmap extension: mutation testing, broad visual regression and multi-browser matrices. These are rejected for now to prevent test gold-plating.

### Stage 13G completion gate

Every destination has an intentional home, all shared identities and match anatomies are coherent, no active hardwired presentation value can drift from its canonical source, seeded multi-user journeys pass, and the owner accepts the app while walking it as a new casual player.

## Stage 13P-A — Converging wall-chart bracket and Share Image

This specialised presentation batch begins only after Stage 13F-K and every Stage 13G batch have been accepted. No incomplete functional or coherence work may be deferred into it.

- Add a classic converging wall-chart layout to the existing Original predicted bracket and live bracket destinations.
- At widths of `≥900px`, place Round of 16 ties on the outer left and right, quarter-finals and semi-finals converging inward, and the final in the centre.
- Below `900px`, retain the current vertical bracket. Do not compress the converging layout onto phone widths.
- Treat the feature as presentation-only: use the existing canonical resolver, slot references, shared `<TeamLabel>` primitive and dashed unresolved-slot chips.
- Keep the predicted and live brackets in separately bannered contexts; they must never blend.
- Render the user's completed converging bracket as the Share Card: a shareable/downloadable image in the Euro 2028 Predictor identity that works on every device, including phones.
- Use shared primitives and semantic tokens only, remain within enforced component and stylesheet size limits, and support loading, empty, error and partial states, both themes, keyboard access, adequate touch targets and reduced motion.
- Add no new bracket logic, data model, migration, scoring rule, lock rule or change to any product invariant.

## Stage 15 — Chromium Playwright assurance

### 15A
Formalise the existing visual fixture system behind development/test-only gates and remove it from production output.

### 15B
Chromium desktop and mobile public/guest journeys. Lightweight axe checks only if inexpensive.

### 15C
Chromium signed-in deterministic journeys, including H2H, Match Centre, Bracket Health, admin visibility and save failures.

### 15D
Add CI only after local suites pass. Ten-minute target. Deployed staging smoke is read-only.

No WebKit, Firefox or visual-regression suite at this stage.

## Stage 15E — WC26 inherited source deletion

After browser coverage:

- delete quarantined WC26 pages, components, stores, hooks, styles, functions and dead assets from `euro28-development`;
- delete snapshot and Daily Question code;
- remove the final compatibility bridge and legacy allowlist;
- never modify `main`.

## 9A. Product completeness gates before wider Euro 2028 scale

The product completeness roadmap is now a governing planning reference for moving Euro 2028 from a WC26-sized friends-and-family audience toward a larger semi-public audience.

### Signup gate sequence

Before registration is opened widely, the roadmap requires:

1. RULES-1 public rules/trust page, including scoring, tie-breaks, correction policy, support contact, privacy note and deletion path.
2. Display-name and league-name moderation: admin rename power, blocked-word check and published policy.
3. Scalable support channel: use generic Contact admin wording unless a later owner-approved contact replaces it.
4. Capacity decision: initial public cap is 250 users and 20 leagues, planned against the current low-cost/free setup until hosting, Supabase Auth and email limits are reviewed.
5. Email confirmation decision: ON for public registration.
6. Privacy note and deletion path: use simple data-use wording and do not claim a specific data region until the actual project region is confirmed.

### Tournament gate sequence

Before the first ball is kicked, the roadmap requires:

1. Final tie-break ladders and resolver-backed final-standings handling.
2. Stage 16A load reality-check at the chosen planning number against leaderboards, Match Centre and league pages.
3. Uptime monitoring and owner-visible error reporting.

Offline player lifecycle and growth mechanics remain scheduled follow-ons unless a later owner decision promotes them to a gate. Unknown-route fallback is closed by Stage PRODUCT-UNKNOWN-ROUTE-1. These entries are docs/audit-only in this alignment package: no Supabase writes, no service-role credential use/read/print, no scoring/resolver/route change and no Migration 019.

Stage PRODUCT-UNKNOWN-ROUTE-1 adds the friendly not-found recovery for unknown `#/...` app hashes. Future agents must preserve the behaviour: unknown app hashes explain that the screen is unavailable, reassure users that predictions have not changed, and offer safe links to Home, Groups and How to play. Invalid Admin sections must remain protected Admin-route recovery, not public not-found recovery. The slice has no Supabase writes, no scoring/resolver change and no Migration 019.

## Stage 16 — Staging-seeded lifecycle simulation

### Stage 16A — Provisional teams, synthetic users and deterministic scenario seeding

#### Stage 16A-S0 — Stage 16A scope alignment

Stage 16A-S0 is a docs/audit launch gate before implementation. It freezes the split into 16A-P1 privacy-safe synthetic identity plumbing, 16A-P2 staging-effective database time and later provisional-team/persona/league/correction/teardown slices. No component, resolver, scoring, route, database or migration implementation is included; active migrations remain 18 and no Migration 019 is created.

This is the opening Stage 16 batch. It is staging-only and must not change the resolver, scoring rules or ordinary product navigation. No migration is permitted unless a genuine schema/read-contract gap is proved and separately packaged.

#### Part A — provisional teams

- create `data/provisional-teams.json` with exactly 24 teams: the five host nations plus nineteen likely qualifiers;
- store name, ISO code, group letter and `provisional: true`;
- add guarded, idempotent `scripts/seed-provisional-teams.mjs` for Euro staging only;
- add replace/confirm mode for the real 24 with `provisional: false`;
- retain the existing shared `TeamLabel` provisional treatment on every surface;
- demonstrate seed, removal and replacement as data-only operations;
- record the first passing rehearsal of the Stage 17 zero-code-change gate.

#### Part B — synthetic users, predictions and leagues

- create `data/synthetic-personas.json` with the approved nineteen deterministic personas;
- create users through the Supabase Admin API using a local service key that is never committed;
- require both the reserved `@synthetic.euro28.test` email domain and `synthetic_euro28: true` metadata marker;
- seed deterministic Original and KO predictions, submitted/unsubmitted twins, joker boundaries, engineered ties, bracket survival/death, partial/no-entry and correction-sensitive cases;
- precompute expected points at every Time & Phase preset using an independent oracle that does not import production scoring code;
- seed one large league of about fourteen members, one tiny league, one user in multiple leagues and at least one user in none;
- keep Original and KO Predictor standings, points and evidence completely separate.

Approved persona keys: `exact_score_heavy`, `outcome_only`, `all_wrong`, `partial_predictions`, `no_predictions`, `submitted_complete`, `unsubmitted_identical`, `joker_cap_reached`, `zero_jokers`, `engineered_tie_a`, `engineered_tie_b`, `bracket_survives_deep`, `bracket_dead_early`, `ko_only`, `original_only`, `ko_advancing_only`, `ko_method_variant`, `ko_joker_variant`, `correction_sensitive`.

#### Part C — exact teardown and repeatability

- add guarded `scripts/remove-synthetic-data.mjs`;
- delete only users carrying both synthetic markers and their cascaded predictions, memberships and scores;
- optionally remove provisional teams;
- leave real accounts, administrators, configuration and staging controls untouched;
- prove seed → validate → teardown → zero residue → reseed is repeatable.

#### Stage 16A acceptance

- populate leaderboards, leagues, H2H, Match Centre, Bracket Health, profiles and player insight end to end;
- assert every persona's expected points at every phase, including replacement scoring after a correction;
- exercise the deferred Stage 13D real multi-user acceptance rows and move them only with evidence;
- demonstrate teardown and clean reseed;
- never trigger the real irreversible global lock on shared staging.

Two separately packaged preconditions are approved before Stage 16A execution:

1. expose a privacy-safe `is_synthetic` read flag and subtle shared identity badge without exposing email or raw auth metadata;
2. provide a staging-only effective database time contract so privacy and lock transitions can be exercised without applying the irreversible real global lock.

Both preconditions must fail closed outside the provisional Euro staging tournament. They may not change scoring values, resolver behaviour or production-time semantics.

### Stage 16E — Managed participants/offline players

Carry the real WC26 need through a Euro-native private-league participant model with audit-logged organiser entry and secure account claim.

### Stage 16 Sentry gate

Decide whether to activate a free-tier staging DSN. Commit no credentials.

## Stage 17 — Official data and dependent activation

- replace the Stage 16A provisional 24 through the approved data-only replace/confirm mode;
- the acceptance gate fails if confirmed-team replacement requires any component or resolver code change;
- confirmed teams, draw, players, dates, times, venues and regulations;
- activate the fully approved tournament-pick feature;
- content, rules and onboarding pass.

## Stage 18 — Optional integrations

- 18A: optional Google sign-in;
- 18B: optional results provider; manual results remain authoritative;
- 18C: properly implemented PWA and push notifications, including service worker, consent, preferences, unsubscribe and delivery acceptance.

## Stage 19 — Rehearsal and launch

- operational, result, scoring, backup/restore and incident rehearsal;
- load and concurrency checks;
- final accessibility, privacy, security and browser review;
- launch and rollback criteria.

## Operational backlog

### OB-1
Monthly manual `npm-check-updates` review. After WC26 ends, decide whether to change the GitHub default branch setting so Dependabot can target active Euro development without changing `main`.

### OB-2
Backup/restore tooling remains functional; rehearse in Stage 19.

### OB-3
Staging owner access remains restricted and documented.

## Next single task

From checkpoint `3c41628`, following accepted Stage 13F-K3 commit `b7f50de` and Stage 13G-R0 commit `586c6a1`, install and accept the first **Stage 13G-A route-integrity slice**. It must add rendered route coverage, the dead-destination audit, canonical Admin section registry, query-addressed Admin section links and invalid-section protected recovery. It must not add a migration, staging role change, real global lock, shared kick-off write, synthetic seeding, Stage 17A or Stage 13P-A work. After acceptance, continue Stage 13G-A with central tournament/lock configuration and shared interaction primitives.

### Approved Stage 13G sequence

- 13G-R0 — canonical reconciliation and contracts.
- 13G-A — Admin route integrity, central configuration and shared interaction primitives.
- 13G-B — Home, lifecycle and KO prominence.
- 13G-C — Groups, standings, bracket coherence and guide.
- 13G-D — People, leagues and sharing.
- 16A — seeded staging cast after identity/sharing contracts stabilise.
- 13G-E — whole-surface coherence.
- 15E — WC26 legacy retirement after tag `legacy-wc26-final`, before 13P-A.

### R0 prohibitions

- no product code;
- no database or staging role change;
- no Migration 019;
- no Results Admin revocation inside the package;
- no change to Original/KO competition separation.

### Stage 13G-A central configuration/shared primitive amendment

- Central provisional prediction lock and tournament start values are now held in `TOURNAMENT_CONFIG`.
- Original Predictor account autosave must use `resolveTournamentLifecycle()` rather than checking database lock fields directly.
- The central provisional value unblocks staging autosave but must never apply the irreversible real global lock.
- Shared `ConfirmDialog`, `SelectField` and `REFRESH_POLICY` primitives are approved for incremental adoption.
- Remaining destructive actions, native selectors and refresh consumers stay ledger-tracked until fully migrated.
- No database change or Migration 019 belongs to this slice.


### Stage 13G-A interaction enforcement close-out

From checkpoint `b38ec64`, install the final Stage 13G-A enforcement slice. It must prove the shared interaction rules in the build, not only in documentation:

- no native active-surface selectors outside `SelectField`;
- no native confirmation calls outside `ConfirmDialog`;
- high-impact Admin lock, feature-control, grace-revocation and whole-tournament reconciliation actions require the shared confirmation dialog;
- manual refresh buttons are removed outside retry/error states;
- `foundation-*` use is capped by `FOUNDATION_CLASS_RATCHET_CAP`;
- `audit:interaction-enforcement` runs inside `npm run check`;
- no database change and no Migration 019.

After this slice, Stage 13G-A is ready to close and Stage 13G-B may begin with Home, lifecycle countdowns, today's-match hub and KO prominence.

### Stage 13G-B Home lifecycle alignment

From checkpoint `08524b6`, install the first Stage 13G-B slice. It must keep database migrations at 18 and must not create Migration 019. It aligns Home with the central lifecycle resolver, displays prediction-lock and tournament-start countdowns from central configuration, adds first-visit/returning-guest conversion copy, promotes live/next fixture context into the Today’s match hub and records the remaining KO-readiness adoption work for nav/leagues. Acceptance requires `audit:home-lifecycle`, focused Home/config tests and the full `npm run check`.


### Stage 13G-B prediction lifecycle slice

From checkpoint `1dda826`, the second Stage 13G-B slice aligns the active prediction surfaces with the central lifecycle model. Original Predictor now shows lock, group-score, winner-only bracket and KO-boundary lifecycle cards. KO Predictor now shows real-fixture readiness and a separate-competition lifecycle strip. The slice adds `audit:prediction-lifecycle` to `npm run check`, keeps active migrations at 18 and adds no Migration 019.


### Stage 13G-B Results lifecycle alignment

The Results, Leaderboards and Match Centre surfaces must consume central tournament lifecycle state and canonical result/fixture state rather than hard-coded phase copy. Original Predictor and KO Predictor leaderboard copy must remain competition-scoped. Match Centre must not reveal unresolved KO fixtures early and must preserve existing prediction privacy gates. `audit:results-lifecycle` is part of `npm run check`. No database change or Migration 019 belongs to this slice.

## Stage 13G-B League Lifecycle Update

- Stage 13G-B League lifecycle alignment is complete at the package level: Leagues and member comparisons now receive central lifecycle context and state Original release as global-lock based while KO release remains fixture-by-fixture. No database change and no Migration 019.

## Stage 13G-B Player Insight and Team Profile lifecycle alignment

- From checkpoint `a651d33`, Player Insight and Team Profile consume central lifecycle context for user-facing phase copy while preserving existing server-authorised privacy gates. Player Insight keeps Original point evidence scoped to group scores plus the winner-only pre-tournament bracket, keeps KO evidence scoped to real knockout fixtures only, and preserves the canonical server privacy phrase. Team Profile keeps prediction aggregates Original-only, excludes KO Predictor data and states that no Original/KO points are combined. The slice adds `audit:player-team-lifecycle`, updates docs/register/ledger in the same package, keeps active migrations at 18 and adds no Migration 019.

## Stage 13G-B KO-readiness signal close-out

From checkpoint `659809c`, Home, Navigation and Leagues consume one shared KO-readiness model derived from canonical fixture readiness rather than separate surface-local checks. Position 1 still remains Groups until all group results and all eight Round of 16 pairings satisfy the approved readiness boundary; early KO access stays in More only. League KO summaries, tabs and lifecycle copy now respect the same real-fixture readiness signal before showing KO standings context. The slice adds `audit:ko-readiness`, updates docs/register/ledger in the same package, keeps active migrations at 18 and adds no Migration 019.

## Stage 13G-H0 housekeeping and record corrections

From checkpoint `5c9f415`, update the governing documents before the next product build. This is docs-only and creates no database migration.

### Corrected recorded state

- Constitution principle 14 records slick and frictionless as the product sensibility: the app opens into what matters now, hides machinery, remembers the player's context, removes before rearranging and favours fewer elements and fewer taps. The access principle remains active as principle 15.
- Tournament Picks contract and Admin readiness are functional, but the ordinary player-facing entry surface is partial/missing. The audit verified the contract, not the ability for users to enter picks.
- Player Insight and H2H engines are useful, but the accepted product shape is a dedicated player view with dedicated H2H and points-breakdown destinations, not the current inline strip.
- Guest signup import is now a dominant one-tap confirmation immediately after signup/sign-in: “Import predictions to my account” or “Start fresh”. Signed-in users must never see “browser draft” language.
- The user-facing FAQ must not include result-correction mechanics.

### Bypass-class sweep to include in the next housekeeping/tooling batch

1. Default `.env.example` time travel to false and document staging-only enablement.
2. Add Vitest coverage thresholds based on current actual live `src/` coverage, excluding legacy and fixtures, plus a no-decrease ratchet.
3. Add eslint-disable governance: every disable needs a reason comment and the total count ratchets downward.
4. Strengthen the frozen bridge melt rule: screen rework must migrate that screen's compat styles to modules and stage ratchets must fall.
5. Prove visual fixture production gating and align it with the Stage14ErrorFixture standard.
6. Clarify size governance: 200/250 review guidance, 400/400 enforced cap, ledgered allowlist and hard cap applied to test fixtures.

### Product items requiring sign-off before build

- Tournament Picks player entry moving earlier than Stage 17A is a schedule change.
- Dedicated player, H2H and points-breakdown routes are a route/deep-link contract change.
- Joker design, bracket long-name resilience and shared Tabs/switcher treatment belong to the 13G-C prediction-surface quality work.
- FAQ/how-to-play is implemented as `#/how-to-play` in 13G-B-TOURNAMENT-1 and must continue to render rule values from central contracts/configuration.
- The converging wall-chart bracket/share image remains scheduled for Stage 13P-A and must not be left as unowned backlog.


### Stage 13G-H1 bypass-class tooling sweep — ACCEPTED
- Time travel defaults false in `.env.example`.
- Coverage floors use current live `src/` actuals and are wired into `npm run check`.
- `eslint-disable` use has reason comments and exact cap ratchets.
- Visual fixtures stay outside the production graph; `Stage14ErrorFixture` is DEV-only.
- Size governance clarifies 200/250 review guidance, 400/400 hard caps and test-fixture ratchets.
- No database change and no Migration 019.


### Stage 13G-H2 product-facing alignment and reference-asset decision — ACCEPTED
- The official UEFA EURO 2028 logo, trophy rendering, tournament wordmark and wider UEFA competition identity are not approved as deployable app assets unless explicit usage permission/licence is obtained and recorded later. Use a future independent app mark instead.
- The WC26/FPL-style league screenshot remains reference only. Evaluated patterns: glanceable rank story adopt-improved; rank movement adapt pending trustworthy previous-rank data; top-three treatment adopt-improved with designed elements and no emoji medals; YOU row anchoring adopt-improved; gap-to-leader adopt-improved; copying the reference layout is dropped.
- Dedicated player route direction is recorded for a later route build: `#/player/:userId`, `#/player/:userId/head-to-head?against=me` and `#/player/:userId/points`. H2 does not build these routes.
- Tournament Picks player-facing entry remains a schedule decision and is not moved into H2. If moved earlier, it must stay Original-only with no jokers and no KO Predictor points.
- Guest signup import prompt and signed-in copy sweep are the recommended next tight product build.
- No route, component, scoring, resolver, database or migration change. Active migrations remain 18 and no Migration 019 is created.


### Stage 13G-C1 guest import prompt — ACCEPTED
- Signed-in guest import uses the accepted dominant prompt: “Import your saved Euro 2028 predictions?”
- Helper copy explains that group scores, bracket picks and/or a KO Predictor draft were found on this device.
- Primary action is “Import predictions to my account”.
- Secondary action is “Start fresh” and clears the saved device-side guest draft without writing to the database.
- Signed-in import/account copy avoids “browser draft”, “browser copy” and “browser predictions” wording.
- Original Predictor and KO Predictor import readiness remain separate and do not blend points, totals, jokers or leaderboards.
- No route, scoring, resolver, league, admin, database policy or migration change. Active migrations remain 18 and no Migration 019 is created.

## Stage 13G-C2 — League race-story polish

Status: complete in development.

Stage 13G-C2 adopts the useful league-reference patterns natively in the Euro design system: a current-user `YOU` row anchor, top-three designed treatment and gap-to-leader race context. Rank movement is explicitly deferred until trustworthy previous-rank data exists. Original Predictor and KO Predictor standings remain separate. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 13G-C3 — League race summary strip

Status: complete in development.

Stage 13G-C3 adds a league race summary strip above ready standings, with you-vs-leader context, leader/current/gap labels, and explicit pre-scoring and empty-member states. Original Predictor and KO Predictor remain separate. Rank movement remains deferred until trustworthy previous-rank data exists. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 13G-C4 — Compact league standings correction

Status: complete in development.

Stage 13G-C4 corrects the over-dense Stage 13G-C2/C3 league presentation. The default private-league table is now a compact running total: rank, member and points. Groups, bracket, scored-match, gap and race-summary breakdowns belong in deeper destinations such as member comparison, player insight, match centre and results. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 13G-C5 — League row detail destination

Status: complete in development.

Stage 13G-C5 preserves the compact private-league table introduced by C4. The default table remains rank, member and points. Deeper member comparison, point splits, gap context and privacy/lock copy now open through the member row detail destination below the table. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 13G-C6 — Compact league page shell

Status: complete in development.

Stage 13G-C6 simplifies the default private-league shell around the compact table. The default view now leads with league selection, competition selection and rank/member/points. League code, lifecycle/privacy copy, summary cards and shared-member notes sit behind details after the table. Original Predictor and KO Predictor remain separate. No database migration was required; active migrations remain 18 and Migration 019 was not created.

## Stage 16A-P1 agent rules — synthetic identity plumbing

Stage 16A-P1 Privacy-safe synthetic identity plumbing is complete as local catalogue and guard tooling only.

Agents must preserve these rules:

- Use exactly nineteen deterministic personas: `exact_score_heavy`, `outcome_only`, `all_wrong`, `partial_predictions`, `no_predictions`, `submitted_complete`, `unsubmitted_identical`, `joker_cap_reached`, `zero_jokers`, `engineered_tie_a`, `engineered_tie_b`, `bracket_survives_deep`, `bracket_dead_early`, `ko_only`, `original_only`, `ko_advancing_only`, `ko_method_variant`, `ko_joker_variant`, `correction_sensitive`.
- Every future synthetic account must use `@synthetic.euro28.test` and `synthetic_euro28: true`.
- Teardown must require both markers before deletion.
- P1 contains no database writes, no user creation, no service-role handling, no UI exposure, no scoring changes, no resolver changes and no Migration 019.
- Tooling must fail closed to Euro staging `gcfdwobpnanjchcnvdco` and explicitly block WC26 production `ouhxawizadnwrhrjppld`.
- Original Predictor and KO Predictor evidence must remain separate.
- Do not start the full seeded cast until Stage 16A-P2 is complete or deliberately re-sequenced.



## Stage 13G-REF agent rules — Home and League prototype adoption

The approved Home and League prototypes are reference artefacts only. Agents must rebuild natively in the Euro design system rather than porting single-file HTML, CSS or JavaScript.

Mandatory Home rules:

- Use one countdown only: `First match & prediction lock`, `Euro 2028 starts in`, `Predictions lock at first kick-off.` and `One deadline. Your Original Predictor locks when the opening match kicks off.`
- The Home countdown, displayed prediction-lock deadline and Original Predictor lock enforcement must read the same central first-kick-off config value.
- Before KO Predictor readiness, Home has zero KO Predictor presence: no card, tease, prompt, locked state, countdown, banner or placeholder.
- Before readiness, KO Predictor discovery is only in the More sheet and the how-to-play guide; the guide line is `everyone starts the knockouts on zero`.
- One readiness signal governs nav tab, Home KO card existence, More KO entry state and league KO standings together.
- Signed-out Home uses the approved thesis hook, three-beat flow, account-first CTAs and guest-draft promise.
- Matchday Home leads with points/rank and uses row order live → upcoming by kick-off → finished.
- Bottom nav baseline rule: the Home circle overlaps the bar line and all five labels share one baseline.

Mandatory League rules:

- League tables are pure: one running total per competition, no stat chips.
- Gap-to-leader appears on every row; leader shows clear of second.
- Top-three badges are designed elements: accent-filled first, accent outline second, quiet ring third. No gold and no emoji.
- Player row tap opens the dedicated S5 player view; inline H2H below the league is retired.
- League switching uses a design-system bottom sheet; delete uses danger-ghost plus shared dialog; copy invite uses confirmed-state plus toast; freshness is passive with no refresh controls.
- KO pre-readiness has no KO tab and no KO table. It shows only: `KO Predictor standings arrive at the knockouts — everyone starts on zero.`
- One central readiness signal drives the KO note, competition tabs and player-view KO line.
- Rules strip must render from the central versioned ruleset.

Do not import prototype sample data, stub toasts, state switches, readiness switches, Google-hosted fonts, CDN flags or single-file architecture. This reference-adoption package creates no Migration 019 and leaves active migrations at 18.


Stage 13G-REF phrase locks: Home and League reference prototype adoption; euro28-home-page-prototype.html; euro28-league-page-prototype.html; not as code to port; sample data; stub toasts; prototype switches; Google-hosted fonts; CDN flags; single-file architecture; same central first-kick-off config value; Predict every match. Beat your mates.; updates if your group predictions change; stat-chip question is closed; rules strip renders from the central versioned ruleset.


Stage 13G-REF audit phrase locks: one countdown, not two; KO Predictor zero Home presence pre-readiness; no KO Predictor card; navigation tab state; More sheet KO entry state; league KO standings availability; leader shows points clear of second; inline-H2H-below-the-league presentation is retired; Freshness is passive.

## Stage 13G-REF-2 — Groups and Original Bracket Reference Prototype Adoption

Status: **SCHEDULED — docs/audit only**
Package date: 2026-07-04
Amended package: includes Groups decisions 9 and 10 before local application
Branch target: `euro28-development`

This package records the approved **Groups** and **Original Bracket** reference prototypes before any build work. It follows the established format: ledger rows first; rebuild natively in the real Euro design system; the prototype's behaviour, hierarchy and copy are the spec; conflicts with confirmed rules are flagged, never silently resolved.

Reference artefacts:

- `docs/reference-prototypes/euro28-groups-page-prototype.html`
- `docs/reference-prototypes/euro28-bracket-page-prototype.html`

These are **reference artefacts, not code to port**. Do not import their sample data, prototype switches, Google-hosted fonts, CDN flags, single-file structure or hardcoded demo picks/results.

Scope locks:

- no UI build
- no route implementation
- no scoring change
- no resolver change
- no Supabase write
- no fixture-data implementation
- no score-stepper UI implementation
- no Migration 019
- active migrations remain 18

## Stage 13F-K3 preservation repair

The Stage 13F-K3 staging acceptance evidence marker must remain preserved across later documentation amendments.

Required preserved marker:

`b7f50de`

Required register line:

`Stage 13F-K3 staging acceptance evidence remains recorded at commit b7f50de and must remain preserved across later Stage 13G and Stage 16A documentation amendments.`

This package includes an idempotent application script that restores the marker if it has been dropped.

## Groups — ledger rows first

| Ledger row | Status | Record |
| --- | ---: | --- |
| 13G Groups reference prototype adoption | SCHEDULED | Approved Groups prototype adopted as behavioural, hierarchy and copy spec; rebuild natively and do not port prototype code. |
| S3.1 Joker control | AMENDED / CLOSED | The bare `J` circle is retired. The joker control is a pill with star icon, `Joker` label and `2×` when armed. Gold fill and gold card border appear when on. Disabled treatment appears at cap. |
| Groups joker meter | SCHEDULED | A five-dot gold JOKER METER sits in the page controls. The same meter pattern is used everywhere jokers exist, including Groups and KO. |
| S3.3 Groups view switcher | AMENDED / CLOSED | `By group | By date` uses the design-system segmented control. Phase defaults follow the recorded rule: by group while predicting, by date once play begins. |
| Groups context banner | SCHEDULED | Context banner changes by phase: privacy before lock; results, points and live-table context once play begins. |
| 4.2 Predicted tables | AMENDED / CLOSED | Predicted tables show qualification edges for top two and third place, are derived live and include `Calculated live from your predictions.` |
| 4.3 Third-place table | AMENDED / CLOSED | Beneath every group table, the third-place ranking across all six groups renders from the same primitive in predicted and real contexts. Top four are marked as bracket-bound with the one-line explainer. |
| Part 1.3 bracket coherence | AMENDED / CLOSED | Warning appears once per session on first group edit. Re-derivation uses FLAG-FOR-RE-PICK. Stale picks are visibly flagged for re-pick and never silently kept or dropped. |
| Lucky Dip placement and behaviour | SCHEDULED | Lucky Dip is a light action beside group progress. It fills only blank scores in the current group and triggers the same save and bracket-coherence flow as manual entry. |
| In-tournament group card anatomy | SCHEDULED | Cards show result, points chip, `You predicted ...` line and joker chip. Joker-doubled points are shown where applied. |
| Match card meta line | AMENDED / SCHEDULED | Every group match card, editable and finished, carries date · venue with the host country's circle flag · group. Venue and host-country data live centrally with fixture data. Provisional venues are data like provisional teams. |
| Score steppers | AMENDED / SCHEDULED | Desktop score-stepper affordance is shown at ≥640px only. Phones keep numeric keypad input only. Steppers clamp 0–15, treat blank as zero on first increment and drive the identical save, coherence-warning and standings flow as typed entry. |
| Stepper accessibility resolution | FLAGGED / REQUIRED | Final implementation must either pad score-stepper hit areas to the standard target size or record a pointer-only exemption in the charter. Undersized 24px targets must not ship silently. |
| Autosave, privacy and zero dev text | SCHEDULED | Autosave pill, privacy context banner and zero dev text are required. |

## Groups — delta list current vs reference

| Area | Current / recorded state | Required delta |
| --- | --- | --- |
| Joker control | Joker caps and locks are already contracted. | Replace any bare/minimal joker UI with the approved pill: star icon, `Joker`, and `2×` when armed. |
| Joker meter | Joker counts exist in rules/contracts. | Add the five-dot gold JOKER METER in Groups controls and reuse it in KO. |
| Disabled at cap | Cap enforcement exists. | Disabled treatment must be visible at cap. |
| View switcher | Groups has phase-aware navigation concepts. | Use the design-system segmented control: `By group | By date`. |
| Phase default | Lifecycle exists. | Predicting defaults to `By group`; in-tournament defaults to `By date`. |
| Context banner | Current page copy is not locked to final wording. | Add the privacy context banner and in-tournament results/points banner. |
| Predicted tables | Predicted tables/resolver exist. | Add qualification edges and `Calculated live from your predictions.` |
| Third-place table | Resolver supports best-third logic. | Surface third-place ranking below every group table in predicted and real contexts. |
| Bracket coherence | Previous register contract exists but presentation needed final wording. | Adopt warning-once and flag-for-re-pick presentation. |
| Lucky Dip | Behaviour is carried from earlier WC26-era decision. | Place beside group progress, fill blanks only in current group and trigger normal save/coherence flow. |
| In-tournament cards | Result/scoring data exists. | Add result + points chip + `You predicted ...` + joker chip anatomy. |
| Match card meta line | Fixture venue data is provisional and central fixture data is already the correct destination for official schedule data. | Add date · venue with host-country circle flag · group to every editable and finished group match card. Venue/host-country values live centrally with fixture data and reuse existing circle-flag assets. |
| Score steppers | Charter already carried desktop stepper affordance. | Add compact score steppers at ≥640px only; phones keep numeric keypad only. Clamp 0–15, blank increments from zero, and trigger the same save/coherence/table flow as typed entry. |
| Stepper accessibility | Prototype displays 24px stepper buttons at desktop width. | Do not ship undersized targets silently. Either pad hit area to the standard target or record a pointer-only exemption in the charter before implementation closes. |
| Autosave and privacy | Autosave journey exists. | Surface compact autosave pill and privacy banner. |
| Prototype exclusions | Prototype includes sample data, phase switch and truncated date list. | Do not import; real date view lists every matchday, next kick-off first. |


## Groups — decisions 9 and 10 register entries

### Decision 9 — Match card meta line

Every group match card, editable and finished, carries the same meta-line structure: date · venue with the host country's circle flag · group. Hampden maps to Scotland, Wembley to England, Aviva to Ireland, Casement to Northern Ireland and Principality to Wales. Venue and host-country data live centrally with the fixture data. Official venue/schedule values are entered at Stage 17; provisional venues are data in the same sense as provisional teams. The venue flag reuses the existing circle-flag asset pipeline and does not create a new asset class.

### Decision 10 — Score steppers

The existing charter line for desktop stepper affordance is implemented as compact up/down chevrons flanking each score input at `≥640px` only. Phones keep the numeric keypad as the sole score input so cards remain compact. Steppers clamp scores to `0–15`, treat a blank field as zero on first increment, and drive the identical save, coherence-warning and standings flow as typed score entry. This is the same save, coherence-warning and standings flow as typed entry.

Accessibility resolution required before implementation closes: the prototype shows 24px stepper targets, which are below the standard target size. The final implementation must either pad the hit area to the standard target or explicitly document a pointer-only desktop exemption in the charter. Undersized targets must not ship silently.

## Groups — Part 1.3 register entry

### Part 1.3 — Bracket coherence after group prediction edits

Approved behaviour: group-score edits re-derive the predicted group tables and therefore the Original Bracket slots that depend on those tables.

On the first group-score edit in a session, the user is shown the approved warning:

`This changes your bracket. Your predicted tables feed your bracket. Editing group scores re-derives it — any picks for teams that drop out of a slot will be flagged for you to re-pick.`

Invalidation behaviour is **FLAG-FOR-RE-PICK**. If a stored Original Bracket pick no longer matches either team feeding that tie after group-table re-derivation, the pick is not silently kept and not silently dropped. The affected tie is visibly flagged for the user to re-pick; the stale pick is never silently kept and not silently dropped.

Tests must cover warning-once behaviour, re-derivation after group edits and flagged-pick presentation on affected bracket ties.

## Original Bracket — ledger rows first

| Ledger row | Status | Record |
| --- | ---: | --- |
| 13G Original Bracket reference prototype adoption | SCHEDULED | Approved Bracket prototype adopted for both mobile stacked and desktop wall-chart layouts. |
| Charter v1.8 wall chart | CONTRACT CHANGE / MOVED INTO 13G | Converging wall chart moves from backlog into 13G scope. |
| Bracket responsive split | AMENDED | Below 900px, the bracket is a vertical stacked layout with per-round pick-progress counters. At ≥900px, it becomes the converging wall chart. |
| Shared bracket state | SCHEDULED | ONE state, ONE set of tie/slot primitives and two arrangements. No layout-specific logic. |
| Slot anatomy | SCHEDULED | Every slot displays its slot-reference origin as a small source code, such as `1B`, `2A` or `3DEF`. |
| Resolved and unresolved slots | SCHEDULED | Resolved slots show flag and name and are tappable to advance. Unresolved slots are dashed placeholder chips and non-interactive. |
| Pick mechanics | SCHEDULED | Tap-to-advance, winner-only. Changing an upstream pick clears only downstream picks that are no longer fed; surviving picks persist. |
| Re-pick presentation | SCHEDULED | A tie whose stored pick no longer matches either feeding slot receives partial/amber treatment and the flag `Re-pick — your tables changed this tie`. |
| Champion strip and champion box | SCHEDULED | Champion strip at top and centred champion box on the wall chart. |
| KO mention compliance | AMENDED | The strip sub-line `Winner picks only — scores and jokers live in the KO Predictor` is the page's only KO Predictor mention. |
| Predicted context banner | SCHEDULED | Banner wording: `Your predicted bracket — built from your predicted tables, never blended with live results`. |
| Original Bracket control absence | TEST REQUIRED | Assert that no score inputs, no method controls and no joker controls exist anywhere on the Original Bracket. |

## Original Bracket — delta list current vs reference

| Area | Current / recorded state | Required delta |
| --- | --- | --- |
| Mobile layout | Original bracket is functional but not locked to final stacked anatomy. | Use vertical stacked layout below 900px with per-round pick counters. |
| Desktop layout | Wall chart was recorded backlog/charter scope. | Move converging wall chart into 13G at ≥900px. |
| State model | Winner-only Original Bracket contract exists. | Preserve one state and one primitive set across mobile and desktop. |
| Slot origins | Resolver owns slot references. | Make slot-reference origin visible on every slot. |
| Placeholder slots | Placeholder standards exist. | Use dashed placeholder chips, non-interactive. |
| Pick mechanics | Winner-only bracket confirmed. | Tap-to-advance; clear only downstream picks no longer fed; surviving picks persist. |
| Stale picks | Groups Part 1.3 settles invalidation behaviour. | Show amber re-pick treatment on exactly affected ties. |
| Champion | Winner pick exists. | Add champion strip and desktop champion box. |
| KO mention | Original and KO are separate competitions. | Only the approved one-line KO mention is allowed. |
| Scores, methods and jokers | Contract says none exist on Original Bracket. | Add an audit/test so they cannot creep in. |
| Live bracket | Live resolver context exists separately. | Same primitives may be used only under a distinct live-context banner. |

## Decisions proposed for sign-off: Bracket items 8–10

### 8. Connector lines

Recommendation: **without connector lines for the first build**.

Reasoning: the approved wall chart already carries the bracket shape through columns and convergence. Connector lines add visual noise on dark mode, can become fragile across responsive widths, and are a common failure point for share-card rendering. Build the line-free wall chart first. Produce a with-lines mock only if visual review or share-card readability proves it is needed.

Proposed sign-off text:

`Proceed without connector lines in 13G. Produce a later with-lines mock only if the line-free wall chart fails visual review or share-card readability.`

### 9. Share-card rendering

Recommendation: **share-card rendering lands in its own follow-on batch**, not inside the first Bracket reference rebuild.

Honest implementation approach: first build the accessible bracket DOM using the shared tie/slot primitives. Then create a dedicated fixed-size share-card export surface that uses the same bracket data and app-owned fonts/tokens. Do not rely on the live responsive viewport as the export target because share cards need stable dimensions, background and theme handling.

Proposed sign-off text:

`Share-card rendering remains recorded 13G follow-on scope, not part of the first Bracket reference rebuild. First build the real wall chart and stacked layout; then implement a dedicated fixed-size share-card export surface using the same bracket data and primitives.`

### 10. Tablet band

Recommendation: **confirm the 900px single breakpoint** for this surface.

Reasoning: below 900px, the stacked layout is more readable than a cramped seven-column bracket. Adding a third 700–900px layout would create another visual and test surface and would undermine the clear contract: one state, two arrangements.

Proposed sign-off text:

`Confirm 900px as the single breakpoint for this surface. Portrait tablets below 900px use the stacked layout. No third intermediate layout is added unless real-device review proves the stacked layout is too weak in the 700–900px band.`

## Original Bracket — register entries for decisions 1–7

### Original Bracket reference adoption — responsive layout and mechanics

The approved Original Bracket reference is adopted for both layouts.

Below 900px, the bracket renders as a vertical stacked layout with per-round pick-progress counters. At 900px and above, it renders as a converging wall chart: Round of 16 on the outer wings, quarter-finals and semi-finals converging inward, with the final and champion box centred.

Both layouts use one bracket state, one tie primitive and one slot primitive. There must be no layout-specific bracket logic.

Every slot displays its slot-reference origin, such as `1B`, `2A` or `3DEF`. Resolved slots show flag and team name and are tappable to advance. Picked slots receive success fill and tick treatment. Unresolved slots are dashed placeholder chips, non-interactive and styled to the existing placeholder standard.

Original Bracket pick mechanics remain tap-to-advance and winner-only. Changing an upstream pick clears only downstream picks that are no longer fed by the bracket. Surviving downstream picks persist.

If a stored pick no longer matches either feeding slot after group-table re-derivation, the tie shows the approved partial/amber treatment with the flag: `Re-pick — your tables changed this tie`. The pick is never silently kept and never silently dropped.

The page includes a champion strip at the top and, in the wall-chart layout, a centred champion box. The approved strip sub-line is: `Winner picks only — scores and jokers live in the KO Predictor`. This is the Original Bracket page's only KO Predictor mention.

The predicted-context banner wording is approved as: `Your predicted bracket — built from your predicted tables, never blended with live results`. A live bracket, when present, may use the same primitives only under its own distinct live-context banner.

Original Bracket compliance is enforced by absence: no score inputs, no method controls and no joker controls may exist anywhere on this page.

## 13G placement and contract changes

Recommended placement after the Stage 13F-K3 marker repair:

1. **13G-REF-1:** preserve the Stage 13F-K3 acceptance marker.
2. **13G-REF-2:** record Groups and Original Bracket prototype adoption.
3. **13G-GROUPS-1:** joker pill, joker meter and disabled-at-cap tests.
4. **13G-GROUPS-2:** view switcher, context banner and phase defaults.
5. **13G-GROUPS-3:** predicted tables and third-place ranking primitive.
6. **13G-GROUPS-4:** bracket-coherence warning and flag-for-re-pick tests.
7. **13G-GROUPS-5:** Lucky Dip and in-tournament card anatomy.
8. **13G-BRACKET-1:** shared slot/tie primitives and stacked mobile layout.
9. **13G-BRACKET-2:** desktop converging wall chart at ≥900px.
10. **13G-BRACKET-3:** pick mechanics, downstream persistence and re-pick flags.
11. **13G-BRACKET-4:** champion strip, context banner and absence audit.

Contract changes flagged:

- Groups Decision 9 adds a match-card meta-line contract: date · venue with host-country circle flag · group on editable and finished group match cards, with venue/host-country data centralised in fixture data and no new asset class.
- Groups Decision 10 adds a score-stepper contract: ≥640px only, 0–15 clamp, blank increments from zero, same save/coherence/table flow as typed entry, and an accessibility resolution before closure.

| Contract | Change |
| --- | --- |
| S3.1 Joker control | Closed. Joker pill replaces the bare `J` circle everywhere. |
| Joker meter | New shared meter pattern for Groups and KO. |
| S3.3 Groups switcher | Closed. Segmented `By group | By date` with phase defaults. |
| 4.2 Predicted tables | Closed. Live-derived predicted tables with qualification edge treatment. |
| 4.3 Third-place table | Closed. Required below every group table in predicted and real contexts. |
| Part 1.3 Bracket coherence | Closed. Flag-for-re-pick after group edits. |
| Original Bracket layout | Converging wall chart moved from backlog into 13G. |
| Original Bracket compliance | Absence of score, method and joker controls becomes testable. |
| Original Bracket KO mention | Only approved one-line mention allowed. |
| Share-card rendering | Kept as separate follow-on unless separately signed off. |

## Checkpoint

- Branch target: `euro28-development`.
- Current known pushed checkpoint before this package: `dcc5042 Record Stage 13G reference prototype adoption`.
- Stage 16A-P1 synthetic identity plumbing was committed at `86eb8d2`.
- Active migrations remain 18.
- Migration 019 must not exist.
- This package repairs the missing Stage 13F-K3 marker `b7f50de` and records Groups/Bracket reference adoption only.

Next single task after this package: `13G-GROUPS-1 — joker pill, shared joker meter and disabled-at-cap tests`.

Audit phrase locks: Stage 13G-REF-2; Groups decisions 9 and 10; euro28-groups-page-prototype.html; euro28-bracket-page-prototype.html; star icon; Joker label; 2×; five-dot gold JOKER METER; bare J circle is retired; By group | By date; third-place ranking across all six groups; Calculated live from your predictions; This changes your bracket; FLAG-FOR-RE-PICK; Lucky Dip; fills only blank scores in the current group; You predicted; date · venue with the host country; host-country circle flag; fixture data; ≥640px; clamp 0–15; blank as zero; pointer-only exemption; autosave pill; privacy context banner; zero dev text; below 900px; ≥900px; converging wall chart; ONE state, ONE set of tie/slot primitives; 1B; 2A; 3DEF; dashed placeholder chips; tap-to-advance; winner-only; downstream picks that are no longer fed; Re-pick — your tables changed this tie; Winner picks only — scores and jokers live in the KO Predictor; built from your predicted tables, never blended with live results; no score inputs; no method controls; no joker controls; without connector lines; share-card rendering lands in its own follow-on batch; 900px single breakpoint; active migrations remain 18; no Migration 019.

## Stage 13G-PLAYER-REF — Player View Reference Placement

Add `13G-PLAYER-REF` after 13G-REF-2 and before 13G-GROUPS-1.

Scope:

- Record the approved Player View / Viewing Player Predictions prototype.
- Treat the prototype as behavioural, hierarchy and copy reference only.
- Rebuild natively in the real Euro design system later; do not port prototype code.
- Preserve privacy: pre-lock player prediction content is hidden behind the informative placeholder.
- Preserve competition separation: Original Predictor and KO Predictor remain separate.
- No UI implementation, route implementation, resolver change, scoring change, Supabase write or migration is allowed in this reference package.

Next build order after this reference is recorded:

1. 13G-GROUPS-1 — joker pill, shared joker meter and disabled-at-cap tests.
2. League/Player View implementation can then consume the approved Player View reference when scheduled.

## Stage 13G-GROUPS-1 — implemented joker pill and shared meter

The Groups predictor now uses the approved shared joker pill and five-dot joker meter. Future KO joker work must reuse the same `JokerPill` and `JokerMeter` primitives rather than introducing a separate control. The retired bare `J` circle must not return.

Stage 13G-GROUPS-2 — implemented Groups view switcher and table fast path. The settled By group / By date toggle is restored, By group remains the default, by-date tickets carry group tags, and a sticky Tables pill opens A–F plus third-place predicted tables. Future Groups work should build on this native implementation rather than re-importing prototype HTML.
Stage 13G-GROUPS-2C — Groups Top Dock Polish: implemented a small presentation-only polish pass to the Groups top focus area and compact A-F rail. Do not treat this as final Groups visual polish, and do not use it as permission to alter scoring, resolver logic, Supabase writes, service-role usage, routes or migrations. Active migrations remain 18 and Migration 019 must not exist.


Stage 13G-GROUPS-2D — Groups Top Dock Repair: removes the redundant top summary chips, keeps predicted-table access as a compact action, improves the By group / By date and A-F group rail presentation, and records that partial score drafts must not crash predicted tables. This remains presentation/model/test/audit/docs only: no scoring, resolver, Supabase write, service-role, route or migration change. Active migrations remain 18 and Migration 019 must not exist.
Stage 13G-GROUPS-2B — repaired Groups page chrome after eye test. Keep Groups and Bracket route-owned; do not reintroduce the old in-page Groups / Bracket / Review switcher on those surfaces. Keep device-draft import banners off the prediction surface, keep status/lifecycle detail in a compact disclosure, keep Lucky Dip behind a slim disclosure, and keep group switching as compact premium chips.

## Stage 13G Destination Reference Adoption — accepted docs/audit checkpoint

The approved reference artefacts for Tournament, How to Play, Account, Admin and Match Centre are recorded under `docs/reference-prototypes/` and guarded by `audit:stage13g-destination-reference-adoption`. Treat them as information architecture, content hierarchy, copy register and data-source discipline references only. Do not port prototype HTML, inline CSS, Google fonts, sample data or demo switches into product code.

Next single implementation task: **13G-B-TOURNAMENT-1 — Tournament / How to Play split and canonical tournament fact correction**. Amend existing Stage 13G-B in place before building. Account, Admin and Match Centre are later focused batches and must not be silently bundled into this Tournament split.

No migration, scoring change, resolver change, Supabase write or WC26 production exposure is authorised by the reference adoption. Active migrations must remain 18 and Migration 019 must not be created.

## Stage 13G-BRACKET-REF — Original Bracket Reference Adoption

Status: accepted docs/audit reference-adoption package for the Original Bracket destination. The approved prototype is `docs/reference-prototypes/euro28-bracket-page-prototype.html`.

Contract change: the charter v1.8 converging wall-chart decision moves from backlog into Stage 13G Original Bracket scope. This is intentional and must not be treated as silent scope drift.

Recorded decisions: below 900px stacked layout with per-round pick counters; at ≥900px converging wall chart; one state and one tie/slot primitive set; visible slot source codes such as `1B`, `2A` and `3DEF`; tap-to-advance winner-only picks; selective downstream clearing; amber re-pick flag `Re-pick — your tables changed this tie`; champion strip and centred champion box; copy `Winner picks only — scores and jokers live in the KO Predictor`; predicted-context banner `Your predicted bracket — built from your predicted tables, never blended with live results`; audit-required absence of score inputs, method controls and joker controls.

Owner sign-off for open decisions: first build proceeds without connector lines; share-card rendering lands in its own follow-on batch; one 900px breakpoint is retained with no intermediate tablet layout unless real-device review proves need.

Scope: no UI build, no route implementation, no scoring change, no resolver change, no Supabase write and no migration. Active migrations remain 18 and Migration 019 must not exist.

Next single task after this docs/audit package: 13G-BRACKET-1 — Original Bracket responsive stacked/wall-chart rebuild with shared tie/slot primitives.


## Stage 13G-BRACKET-1 — Original Bracket Responsive Wall-Chart Rebuild

Next-agent checkpoint: Stage 13G-BRACKET-1 now implements the approved Original Bracket stacked/wall-chart rebuild. Treat the Original Bracket as a winner-only Original Predictor surface using one `OriginalBracketTie` and one `OriginalBracketSlot` primitive set across the single 900px breakpoint. Do not reintroduce layout-specific business logic, connector lines, score inputs, method controls or joker controls.

Acceptance must include `npm run audit:stage13g-bracket-responsive-wallchart`, the existing Bracket reference audit, frontend architecture audit, full check, build and deployed foundation verification. Active migrations remain 18 and Migration 019 must not be created unless a genuine schema/read-contract gap is proved.

## Stage 13G-ACCOUNT-1 — Account destination rebuild

Next-agent checkpoint: Account has been rebuilt as a focused signed-in destination. Preserve the one-time guest-transfer dialog placement, the corrected keep/start-fresh copy, the Original-only pre-lock clear action and the no-Migration-019 boundary. Do not merge later Admin or Match Centre work into this batch.


## Stage 13G-ADMIN-1 — Admin control-room cosmetic restyle

Next-agent checkpoint: Admin has been restyled as a cosmetic-only protected control-room destination. Preserve the existing Admin route gate, section registry, owner/results-admin boundaries, note gates, confirmation behaviour, append-only audit model, Tournament Picks readiness contract and no-Migration-019 boundary. Do not merge Match Centre work into this batch.

Acceptance must include `npm run audit:stage13g-admin-control-room-restyle`, existing Admin control-room audits, route integrity, frontend architecture, lint, tests, build, full check and deployed foundation verification.


## Stage 13G-MATCH-CENTRE-REF — Match Centre group-match reference adoption

Accepted scope:

- record the approved Match Centre group-fixture decisions as a docs/audit-only package;
- keep group fixtures to Original Predictor only while knockout fixtures retain Original/KO Predictor tabs;
- require `Live projection` and `Final` group-impact states from group live/confirmed status;
- require live/final projections to reuse `resolveGroupTable`, not a second standings calculator;
- keep bracket-point preview read-only and forbid writes to `bracket_predictions`, persisted standings or scores;
- forbid hardcoded matchday triggers;
- preserve the knockout `Points on the line` panel unchanged;
- replace group maximum-available framing with `This match’s predictions`;
- wire `audit:stage13g-match-centre-reference-adoption` into `npm run check`;
- keep `13G-MATCH-CENTRE-1` as the separate implementation slice;
- create no database change and no Migration 019.

Completion gate: this reference stage does not make Match Centre group-match upgrade functional. The ledger row remains non-functional until `13G-MATCH-CENTRE-1` implements and audits the behaviour in the real app.

## Stage 13G handover checkpoint — after Admin restyle

Current deployed head before the handover-docs package is `8ee70ec Restyle Stage 13G admin control room`. Tournament/How to Play, Account and Admin are complete/deployed; active migrations remain 18 and no Migration 019 exists.

Read `docs/STAGE-13G-HANDOVER-20260705.md` and `docs/NEXT-CHAT-PROMPT-STAGE-13G-CONTINUATION.md` before starting the next chat. The next work must be one scoped stage only:

1. Match Centre reference adoption / group-match implementation;
2. Player View, Head-to-head and Points Breakdown destinations;
3. UI-copy hygiene once all named audit files are available.

For Match Centre, projections are screen-only and must never write to persisted bracket predictions, standings or scores. For Player destinations, reuse existing H2H, points and insight engines. For copy hygiene, never hardcode user-facing prose into audit marker lists; use shared named constants for copy that audits must locate.

## Stage 16A-P2 staging-effective database time — accepted process guard

Stage 16A-P2 — Staging-effective database time is a guarded planning, model and audit package. It records that later seeded acceptance must exercise privacy, simulated-lock, release, correction-review and final-state evidence through the existing Time & Phase control. It must not apply the irreversible real global prediction lock, must remain Euro-staging-only, must block WC26 production, must not create users or seed predictions, must not change scoring/resolver/UI routes and must create no Migration 019. Original Predictor and KO Predictor evidence remain separate.

Stage 16A-P6A — Seed write acceptance plan only is accepted as the current no-write checkpoint. It records `writesDatabase: false`, `canStartWrite: false`, `hasWriteExecutor: false`, `requiresExplicitNextSliceApproval: true`, exact local environment names, exact later-slice write flags, dual synthetic markers, exact teardown selector, zero-residue proof and reseed validation proof. It performs no database writes, no user creation, no prediction seeding, no service-role credential reading or printing and no Migration 019.

Stage 16A-P5 — Staging write preflight and teardown contract remains accepted as the prior no-write preflight checkpoint.

Stage 16A-P4 — Seed SQL preview dry-run remains accepted as the prior read-only SELECT checkpoint.

Stage 16A-P3 — Seed manifest dry-run remains accepted as the prior no-write checkpoint.

## Stage 16A-P4 seed SQL preview dry-run — accepted process guard

Stage 16A-P4 — Seed SQL preview dry-run is a read-only SELECT preview package. Agents must treat it as a no-write scaffold, not as seeded acceptance.

Rules:

- Do not execute Supabase writes in Stage 16A-P4.
- Do not create Auth users.
- Do not seed predictions.
- Do not require service-role credentials.
- Do not change scoring, resolver logic or UI routes.
- Do not create a database migration.
- Keep active migrations at 18 and do not create Migration 019.
- Keep Original Predictor and KO Predictor separate.
- Keep WC26 production blocked.

The next Stage 16A package may prepare a narrow executor preflight only after preserving the same staging-only, no-secret, teardown-safe and no-combined-points boundaries.

## Stage 16A-P3 seed manifest dry-run — accepted process guard

Stage 16A-P3 — Seed manifest dry-run is a manifest dry-run only package. Agents must treat it as a no-write planning layer, not as seeded acceptance.

Rules to preserve:

- 24 provisional team slots, 19 synthetic personas and 11 resettable time-phase cases are planned locally only.
- No database writes, no user creation, no prediction seeding and no service-role credential requirement are introduced.
- No scoring, resolver, UI route, Supabase policy or migration change is allowed in this package.
- Original Predictor and KO Predictor remain separate.
- WC26 production remains fail-closed and Euro staging is the only accepted project ref.
- The future teardown sequence remains seed → validate → teardown → zero residue → reseed and must require both synthetic markers.
- Active migrations remain 18 and no Migration 019 is created.

The next package must remain narrow. Do not combine provisional teams, Auth user creation, profile writes, predictions, leagues, scoring oracle, correction rehearsal and teardown in one patch.

## Stage 16A-P5 staging write preflight — accepted process guard

Stage 16A-P5 — Staging write preflight and teardown contract is a no-write preflight package. Agents must treat it as a pre-executor guard, not as seeded acceptance and not as permission to write staging data.

Rules:

- Keep `canStartWrite: false`.
- Keep `requiresExplicitNextSliceApproval: true`.
- Record local environment variable names only; do not read or print secret values.
- Do not execute Supabase writes in Stage 16A-P5.
- Do not create Auth users.
- Do not seed predictions.
- Do not use, read or print service-role credentials.
- Do not change scoring, resolver logic or UI routes.
- Do not create a database migration.
- Keep active migrations at 18 and do not create Migration 019.
- Keep Original Predictor and KO Predictor separate.
- Keep WC26 production blocked.
- Future teardown must require both `@synthetic.euro28.test` and `synthetic_euro28: true`.
- Future acceptance must prove zero residue and clean reseed validation.

The next Stage 16A package is Stage 16A-P6A — Seed write acceptance plan only. It must remain docs/audit/test-only, must keep `writesDatabase: false`, `canStartWrite: false` and `hasWriteExecutor: false`, and must define the exact acceptance evidence before any write-capable skeleton is introduced.


## Stage 16A-P6A seed write acceptance plan — accepted process guard

Stage 16A-P6A — Seed write acceptance plan only is a docs/audit/test-only acceptance-plan package. Agents must treat it as a no-write checkpoint, not as seeded acceptance, not as a write skeleton and not as permission to write staging data.

Rules:

- Keep `writesDatabase: false`.
- Keep `canStartWrite: false`.
- Keep `hasWriteExecutor: false`.
- Keep `requiresExplicitNextSliceApproval: true`.
- Record exact local environment names only; do not read or print secret values.
- Define the later-slice write flags exactly as `STAGE16A_ALLOW_STAGING_SEED_WRITE=true` and `STAGE16A_SEED_TEARDOWN_CONFIRMATION=I_UNDERSTAND_STAGE16A_SYNTHETIC_TEARDOWN_ONLY`.
- Do not execute Supabase writes in Stage 16A-P6A.
- Do not create Auth users.
- Do not seed predictions.
- Do not use, read or print service-role credentials.
- Do not change scoring, resolver logic or UI routes.
- Do not create a database migration.
- Keep active migrations at 18 and do not create Migration 019.
- Keep Original Predictor and KO Predictor separate.
- Keep WC26 production and `main` blocked.
- Future teardown must require both `@synthetic.euro28.test` and `synthetic_euro28: true`.
- Future acceptance must prove seed, validate, teardown, zero residue, reseed and validate again before Stage 16A closes.

The next Stage 16A package may consider a default-off write-capable skeleton only after explicit approval. It must not combine Auth user creation, profile rows, provisional teams, predictions, leagues, corrections, scoring oracle and teardown in one patch.


### Stage RULES-1A — rules hub UI upgrade

The existing `#/how-to-play` route has been upgraded into the rules hub. Future agents must keep it read-only and config-driven where practical: scoring values come from `EURO_SCORING_CONFIG`, Original Predictor and KO Predictor remain separate, and owner decisions for support contact, Supabase region, email confirmation and capacity/tier must not be invented. RULES-1A has no Supabase writes, no service-role use, no scoring/resolver change, no new route and no migration.


## Stage PRODUCT-GATE-DECISIONS-1 — Product gate decisions register

Stage PRODUCT-GATE-DECISIONS-1 records the next signup/tournament decision rows: tie-break ladders, display-name and league-name moderation, capacity planning and email confirmation. Stage OWNER-SIGNUP-DECISIONS-1 later records the signup owner choices. Tie-break and moderation implementation remain later scoped stages.

Stage RULES-1B-SIGNUP-GATE-STATUS makes the remaining public-signup gates visible on the Rules Hub. Stage OWNER-SIGNUP-DECISIONS-1 later records the owner choices, but future agents must not treat the visible panel or recorded choices as permission to open wider signups.

Scope guard: docs/audit-only. Do not add Supabase writes, Auth users, prediction seeding, service-role credential use/read/print, scoring changes, resolver changes, UI route changes or a migration under this stage. Active migrations remain 18 and Migration 019 must not exist.

## Stage PUBLIC-SIGNUP-READINESS-1 — Public signup readiness model

Stage PUBLIC-SIGNUP-READINESS-1 centralises the app's wider public-signup readiness answer. Future agents must preserve `src/auth/publicSignupReadiness.js` as the source for the Rules Hub signup-gate panel while the gate is open. Do not infer that visible signup-gate copy means public registration is open. Wider public signups remain closed until the recorded decisions and their implementation gates are accepted by later approved stages. This stage has no Supabase writes, no Auth-user creation, no service-role credential use/read/print, no scoring/resolver/route change and no Migration 019.

## Stage OWNER-SIGNUP-DECISIONS-1 — Public signup owner decision pass

Stage OWNER-SIGNUP-DECISIONS-1 records the signup owner choices in docs and `src/auth/publicSignupReadiness.js`: Contact admin support wording, 250 users, 20 leagues, current low-cost/free planning, email confirmation ON, conservative privacy wording with no specific region claim, blocked racist/discriminatory/anti-immigrant/sectarian/abusive/inflammatory names, and no permanent invite-only requirement once moderation and remaining safety checks are complete. Future agents must preserve that public registration remains closed after this stage. Do not add Auth config changes, signup opening, Supabase writes, service-role credential use/read/print, scoring/resolver/route changes or Migration 019 under this stage.


## Stage DESIGN-CONTRACTS-BATCH-0 — Visual-contract rule recording

Stage DESIGN-CONTRACTS-BATCH-0 records the visual-contract rule before the all-main-pages design drafting programme begins. Future agents must treat approved files in `docs/reference-prototypes/` as binding visual contracts for layout, hierarchy, page composition, state coverage and Night Broadcast identity treatment, while also treating those files as reference artefacts only. Do not port prototype HTML, inline CSS, fake JavaScript, demo toggles, CDN fonts, sample datasets, local storage or hardcoded states into production code.

The design-contract programme must proceed in batches. Each batch first produces candidate HTML references and a summary, then stops for Nicky's approval. After approval, exactly one contract file per surface is retained; old references are superseded rather than accumulated. Any proposed visual treatment that requires an unrecorded behaviour, route, data contract, scoring rule, resolver change, signup state, moderation action or Auth change must be flagged in the batch summary and must not be implemented silently.

The approved Groups Night Broadcast direction is the identity anchor and must not be redrafted unless Nicky explicitly reopens it. The approved Leagues / League table D contract is also binding and must not be redrafted unless Nicky explicitly reopens Leagues. Bracket G is approved as the Original Bracket visual contract, including the proper ≥900px desktop wall chart with Round of 16 on the outside edges, quarter-finals and semi-finals stepping inward, a centred final, small slick `vs`, and date/time/stadium/host-flag match detail. KO Predictor F is approved as the KO Predictor visual contract, with teams pending before readiness and real fixtures once ready. Bracket Health remains unapproved and must not be implemented until separately approved. Admin remains last.

Scope guard: docs/reference only until later approved implementation packages. Do not modify `src/`, `supabase/`, migrations or tests in the drafting programme. Do not change product behaviour, routes, copy in active app code, scoring, resolver logic, Auth config, signup state, Supabase writes, service-role credential use/read/print or Migration 019 under this stage. Active migrations remain 18, Original Predictor and KO Predictor remain separate, and predicted/live bracket contexts must never blend.

## STAGE-RULES-SCORING-LOCK-1 guardrail

The locked scoring/rules target is now recorded in `docs/RULES-SCORING-LOCKED-CONTRACT.md` and `docs/STAGE-RULES-SCORING-LOCK-1.md`.

Future agents must treat those files as the product target for scoring explanations, Review completion, Prediction Trends, scoring displays and tournament-readiness acceptance.

Key guardrails:

- Do not reintroduce manual group-goals editing. Group goals are auto-calculated only from the 36 group-score predictions.
- Do not award extra points for unresolved tie ordering. It only records intended predicted order after score-derived tiebreakers fail.
- Do not let predicted-table manual orders alter official real result tables.
- Do not combine Original Predictor and KO Predictor points or tiebreaks.
- Do not enable API-dependent extras such as first-goal bracket or per-goal top-scorer points unless reliable official/API data can confirm them automatically.
- Do not score delayed, postponed, suspended, abandoned, replay-required or result-pending matches until the official result state is valid.
- Do not create Migration 019 unless a genuine schema/read-contract gap is proved and Nicky explicitly approves it.

This stage did not change runtime scoring or resolver behaviour. Any future runtime alignment must be explicit, safe, audited and separate from unrelated UI work.

<!-- group goals correction marker: group goals are auto-calculated only. -->


### STAGE-ENTRY-AND-REVIEW-JOURNEY-1 — Entry and Review journey contract

Recorded after `STAGE-RULES-SCORING-LOCK-1` as the governing contract for Home clarity, Review Picks, Welcome and Invite/Join. The stage locks the progress-aware CTA ladder, Review completion blockers, no wrong-state flicker requirement, unresolved in-group tiebreaker prompt, best-third prompt, bracket invalidation warning, joker confirmation modal, calculated-only group-goals display, locked prediction snapshot and invite/join states.

Scope is docs/audit-only. It does not change runtime UI, routes, scoring, resolver, Supabase, Auth, result-entry or migrations. Active migrations remain 18 and Migration 019 is not created.

Agent rule: do not implement Home, Review Picks, Welcome or Invite/Join from memory. Use `docs/ENTRY-AND-REVIEW-JOURNEY-CONTRACT.md` as the target. Review Picks is not complete by row counts alone; blockers include resolver prompts, stale bracket state, joker-on-incomplete-score and save/import state. Preserve no wrong-state flicker and keep Original/KO separate.

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



### Stage STAGE-PUBLIC-SIGNUP-IMPLEMENTATION-1

Future agents must preserve this implementation boundary: client-side pre-Auth display-name moderation is implemented for public signup, the existing availability RPC check remains before Auth sign-up, and public registration remains closed until the external Auth/config checks are confirmed. Do not treat this stage as an instruction to change Supabase Auth dashboard settings, open wider registration, add service-role credentials, add Supabase writes, alter scoring/resolvers, write fake results, create league writes or create Migration 019.


## Stage STAGE-PUBLIC-SIGNUP-OPENING-GATE-1

STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 records the final pre-open checklist for public signup, visible “registration still closed / opening soon” state, explicit owner approval requirement before opening registration, confirmation that email confirmation is ON, confirmation redirect URLs are correct, confirmation capacity limits are acceptable, confirmation support/contact route is ready, confirmation display-name moderation is active, no Supabase Auth dashboard/config change in the patch and public registration remains closed.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

A later opening stage may only proceed after explicit owner approval. This gate must not be treated as permission to open public registration.

STAGE-PUBLIC-SIGNUP-OPENING-GATE-1 marker record: final pre-open checklist for public signup; visible “registration still closed / opening soon” state; explicit owner approval requirement before opening registration; confirmation that email confirmation is ON; confirmation redirect URLs are correct; confirmation capacity limits are acceptable; confirmation support/contact route is ready; confirmation display-name moderation is active; public registration remains closed; Migration 019 remains blocked.

## Stage STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1

STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 records the controlled public signup opening runbook, owner approval must be explicit, current and recorded, opening-gate checklist must be satisfied before any public opening, email confirmation must be checked in the external account settings, account redirect URLs must return to the Euro 2028 app, not WC26, display-name moderation remains before account creation, display-name availability remains before account creation, support/contact route remains visible for public users, initial capacity remains 250 users and 20 leagues unless replaced by an owner decision, public registration remains closed until the owner completes the external opening action, and no Supabase Auth dashboard/config change in the patch.

Scope is docs/audit-only. It does not change runtime UI, routes, Auth configuration, Supabase schema/RPC/RLS/service-role use, browser writes, scoring engine, resolver behaviour, official result entry, fake-result writes, league writes or migrations. Active migrations remain 18 and Migration 019 is not created.

A later opening stage may only change app-side public signup status or external opening behaviour after the owner confirms the controlled-open runbook. This stage must not be treated as permission to open public registration.

STAGE-PUBLIC-SIGNUP-CONTROLLED-OPEN-1 marker record: controlled public signup opening runbook; owner approval must be explicit, current and recorded; opening-gate checklist must be satisfied before any public opening; email confirmation must be checked in the external account settings; account redirect URLs must return to the Euro 2028 app, not WC26; display-name moderation remains before account creation; display-name availability remains before account creation; support/contact route remains visible for public users; initial capacity remains 250 users and 20 leagues unless replaced by an owner decision; public registration remains closed until the owner completes the external opening action; Migration 019 remains blocked.

## STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 — CLOSED / RECORDED

STAGE-PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-1 records the owner-checked external settings for the controlled public signup path. Euro staging project checked: gcfdwobpnanjchcnvdco. Email confirmation: ON. New user signups: still closed. Site URL / app URL: https://euro28-predictor-dev.netlify.app. Redirect URLs include Euro dev site: yes. Redirect URLs currently include local dev URLs: yes. WC26 URLs used for Euro auth return: no. Email templates editable without SMTP: no. Email templates mention WC26: unable to edit/check fully without SMTP. Custom SMTP required before branded public email templates: yes. Initial capacity accepted before SMTP: 50 users / 20 leagues. Target capacity after SMTP: 100 users / 20 leagues. Review point after SMTP: 75 users / 15 leagues. Support/contact route required: yes. Display-name moderation required: yes. Public registration remains closed; active migrations remain 18; Migration 019 remains blocked.

This stage replaces the earlier 250-user planning figure for the first opening path. Before SMTP/branded email delivery, the cap is 50 users and 20 leagues. After SMTP is configured and usage is reviewed, the next target is 100 users and 20 leagues, with review at 75 users or 15 leagues.


Capacity marker: initial capacity is replaced by the external settings check: 50 users and 20 leagues before branded email sending, then 100 users after email delivery is reviewed.
