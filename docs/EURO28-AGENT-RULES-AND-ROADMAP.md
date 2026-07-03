# EURO 2028 PREDICTOR
## Agent Rules and Functional-Completion Roadmap
### Version 4.24 — Stage 13G-H0 housekeeping and record corrections

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

### Stage 13G-B — Tournament comprehension and match organisation

Accepted Home/lifecycle slice from `08524b6` adds first-visit/returning guest copy, central-config countdowns, a Today’s match hub, Home KO-readiness signal and a build audit. Remaining Stage 13G-B work stays scoped to match organisation and tournament comprehension.

- real-time chronological match ordering;
- By group and By date group-stage views using shared match components;
- By group default before the opening match and By date default once play starts, while respecting manual choice;
- complete Tournament and how-to-play destination;
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

## Stage 16 — Staging-seeded lifecycle simulation

### Stage 16A — Provisional teams, synthetic users and deterministic scenario seeding

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
- FAQ/how-to-play belongs to 13G-B/C and must render rule values from central contracts/configuration.
- The converging wall-chart bracket/share image remains scheduled for Stage 13P-A and must not be left as unowned backlog.
