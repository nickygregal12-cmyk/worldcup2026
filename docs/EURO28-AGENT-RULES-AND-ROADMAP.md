# EURO 2028 PREDICTOR
## Agent Rules and Functional-Completion Roadmap
### Version 4.1 — Stage 14B structural compliance from `66adb1f`

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

### Batch 2 — structural compliance

- split `LeaguesFoundation.jsx` into a 399-line controller and 245-line presentation module;
- split `PredictionJourneyFoundation.jsx` into a 327-line controller, 208-line view and 41-line runtime helper;
- split `ResultsAndLeaderboardsFoundation.jsx` into a 165-line controller and 280-line presentation module;
- remove all three temporary component caps;
- update feature audits to inspect the complete split feature rather than one historical file;
- preserve existing class names, styling, behaviour and visual baselines;
- defer style ownership migration because no styling was materially changed and all global compatibility ceilings remain frozen.

### Batch 3 — contrast completion

- present the four current light-theme failures with proposed minimal token corrections;
- apply only owner-approved token changes;
- remove every contrast exception;
- prove both themes and baselines remain coherent.

Stage 14B ends with no oversized active UI component and no contrast exception.

## Stage 13F-0 — Site-wide information architecture and access contract

This stage precedes new player-experience features.

### Current finding

The complete overall leaderboards are technically accessible for signed-in users:

- desktop: `Results` in primary navigation;
- mobile: `More` → `Results`;
- route: `#/results` or `#/leaderboards` alias;
- data: the RPC returns the full table without a row limit;
- presentation: all returned rows are rendered.

The experience is still partial because leaderboards sit below results, live tables and live bracket in one long page, there is no dedicated leaderboard route state or competition deep link, and Home rank summaries do not take users directly to the relevant table.

### Required access architecture

1. Preserve the confirmed five-position mobile lifecycle.
2. Add a dedicated **Leaderboards** destination in More and an explicit `#/leaderboards` route.
3. Make `Results` focus on fixtures, live tables and live bracket.
4. Make `Leaderboards` focus on:
   - Original overall table;
   - KO overall table;
   - competition-specific points entry;
   - player identity and H2H entry.
5. Home Original/KO rank and points summaries link directly to the matching competition view.
6. Leagues retains private-league standings and links player identities into the same shared player experience.
7. Match Centre receives a direct match route/deep link when Stage 13F-C lands.
8. Bracket Health is entered from the Original Bracket and relevant Home status, not as an unrelated main destination.
9. Admin is absent unless access is positively confirmed.
10. Account owns guest conversion, identity and security.
11. Tournament owns format, rules and explanatory content.
12. Every approved feature receives:
    - one clear primary entry;
    - contextual entry links where useful;
    - back/close behaviour;
    - mobile and desktop access;
    - loading, empty, error and unauthorised handling;
    - a direct route where sharing/reload/bookmarking is valuable.

The implementation must not add a sixth permanent mobile navigation position.

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

Complete and accept Stage 14B Batch 1, then prepare Stage 14B Batch 2 screen splits from the accepted checkpoint.
