# EURO 2028 PREDICTOR
## Agent Rules and Functional-Completion Roadmap
### Version 4.5 — Stage 13F-B player identity and complete H2H from `2e2b9a8`

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
- No Migration 016 without a separately approved server/data defect or feature design.
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

## Stage 13F-I — Tournament-pick contract

Confirmed direction:

- Original Predictor only;
- global lock;
- no joker;
- central versioned ruleset;
- Home live-race card;
- no standalone Awards page.

Recommended list awaiting approval:

- total tournament goals;
- top scorer;
- highest-scoring team.

The real player selector activates only in Stage 17A when official player data exists.

## Stage 13F-J — Player insight and points storytelling

- complete tournament summary for the viewing user and authorised visible players;
- canonical points-source breakdown for group matches, group positions, Original bracket, awards/extra picks and KO Predictor separately;
- correct outcomes, exact scores, successful jokers, matches scored, best matchday, streak and best/toughest calls where canonical data supports them;
- expandable matchday, bracket-health, disagreement and awards/totals comparisons;
- reuse Stage 13F-B player identity and H2H primitives;
- never combine Original and KO Predictor totals;
- no independent component scoring calculations.

## Stage 13P-A — Converging wall-chart bracket and Share Image

This is the first polish batch after every Stage 13F functional-completion batch has been accepted. No incomplete Stage 13F work may be deferred into this batch.

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

## Stage 16 — Local seeded lifecycle simulation

- local Supabase first because both free hosted project slots are occupied;
- multiple synthetic users;
- real RLS/RPC/persistence;
- lock/privacy/grace transitions;
- results, corrections and replacement scoring;
- full tournament and all best-third combinations;
- complete deferred Stage 13D acceptance.

### Stage 16E — Managed participants/offline players

Carry the real WC26 need through a Euro-native private-league participant model with audit-logged organiser entry and secure account claim.

### Stage 16 Sentry gate

Decide whether to activate a free-tier staging DSN. Commit no credentials.

## Stage 17 — Official data and dependent activation

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

Install and accept Stage 13F-D, then begin Stage 13F-E Admin invisibility.

### Stage 13F-E — Admin invisibility

Accepted scope: hide every Admin discovery path from non-admin users, fail closed on direct route access, and retain all existing control-room capability for server-verified administrators. No migration. The next functional-completion batch is Stage 13F-F.
