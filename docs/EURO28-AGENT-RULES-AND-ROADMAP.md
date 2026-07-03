# EURO 2028 PREDICTOR
## Agent Rules and Functional-Completion Roadmap
### Version 4.3 — Stage 13F-0 access architecture from `7261888`

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

## Stage 13F-0 — Site-wide information architecture and access contract

### Implementation scope

- dedicated `#/leaderboards` route rather than a Results alias;
- Results owns fixture/result feed, live tables and live bracket;
- Leaderboards owns full Original/KO tables and matching points;
- competition-specific Home deep links;
- Leaderboards in More without changing the five-position mobile navigation;
- permanent `EURO28-SITE-ACCESS-MAP.md`;
- `audit:access` enforcement;
- corrected Project Constitution adoption.

Admin invisibility remains Stage 13F-E and is explicitly not claimed complete here. Future H2H, Match Centre and Bracket Health entry rules are recorded now and implemented in their owning stages.

## Stage 13F-A — Guest journey and Lucky Dip

- verify full guest Groups, Original Bracket and eligible KO use;
- automatic local persistence;
- designed signup encouragement;
- one-tap guest-draft transfer after signup/sign-in;
- never clear local data before confirmed account save;
- remove ordinary JSON file controls;
- Euro-native Groups Lucky Dip without odds or automatic jokers.

## Stage 13F-B — Player identity and complete H2H

- one reusable player identity primitive;
- league and overall usage;
- aligned match-by-match Original and KO comparison;
- current privacy rules preserved;
- competition totals remain separate.

## Stage 13F-C — Euro Match Centre

- canonical fixture/result state;
- authorised player predictions;
- points and joker outcomes;
- player identity entry;
- optional trustworthy live-minute slot;
- no odds or weather;
- no WC26 MatchStats reuse.

A new privacy-safe bulk RPC requires separate design and Migration 016 approval.

## Stage 13F-D — Original Bracket Health

- alive teams and paths;
- eliminated teams and dead paths;
- earned and maximum remaining bracket points;
- predicted/live contexts remain distinct.

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

## Post-design optional enhancement — Share Card

Reconsider only after all functional stages and final design sign-off. Add only if a natural location and real player value are demonstrated.

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

Install and accept Stage 13F-0, then begin Stage 13F-A guest journey completion and Euro-native Lucky Dip.
