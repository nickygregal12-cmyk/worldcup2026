## Codex Copy-Back Report

### 1. Task

Implement the owner-approved Product Experience v3 visual and navigation slice while preserving
all existing Euro 2028 prediction, scoring, privacy and database contracts.

### 2. Branch

`euro28-development`

### 3. Files changed

* Governance: `docs/reference-prototypes/euro28-product-experience-v3.md`, the Decision Register,
  Functional Completion Ledger, Design Charter, Site Access Map and agent-control documents.
* Visual CI: `.github/workflows/visual.yml`, `visual-product.html`, `scripts/visual-*.mjs`,
  `scripts/lib/visualAppTarget.mjs` and isolated `src/testFixtures/productVisual*` fixtures.
* App shell: `src/App.jsx`, `src/app/EuroAppShell.jsx`, `MobileNav*`, `MoreMenu*`, route and
  auto-hide models/tests.
* Product surfaces: `src/home/*`, `src/journey/*`, `src/leagues/*`, `src/matchCentre/*`,
  `src/player/*`, `src/bracketHealth/*` and `src/results/ResultsAccess.module.css`.
* Guardrails: relevant architecture, token, league, route, lifecycle, player and Match Centre
  audit scripts plus focused tests.

### 4. Changes made

* Aligned all five mobile-navigation controls, retained the larger centre Home treatment and made
  the whole bar hide/reveal smoothly.
* Rebuilt More as a grouped lifecycle-aware directory and reordered Home around rank, leagues,
  Original completion and a quiet KO teaser.
* Added persistent By group/By date landing, next/live match positioning and Match Centre links to
  all Groups match cards.
* Kept Original Bracket round-by-round on phones and strengthened selected winners/connectors in a
  distinct predicted-context treatment.
* Split the Leagues UI into independent Original and KO collections, with separate selections and
  create/join empty states once KO opens.
* Added a compact player profile sheet, competition-scoped full-profile/points/H2H/bracket links
  and authorised Original bracket reconstruction/health presentation.
* Reworked Match Centre for phone use with fixed-competition league scopes, clickable players and
  current points-target states; clarified Results/Leaderboards tabs.
* Added deterministic visual workflow fixtures without importing mock state into production.

### 5. Commands run and results

* `npm ci` — PASS
* Focused Vitest suites for shell, Home, Groups, bracket, leagues, profiles, Match Centre and
  Results — PASS
* Focused architecture, lifecycle, route, privacy, design-token and competition-separation audits
  — PASS
* `npm run audit:coverage` — PASS (138 files, 861 tests)
* `npm run lint:foundation` — PASS
* `npm test` — PASS (138 files, 861 tests)
* `npm run build` — PASS
* `npm run check` — PASS (full audit chain, coverage, lint, 861 tests and production build)

### 6. Scope guard

* Scoring touched: no
* Resolver touched: no
* Supabase Auth touched: no
* Migrations touched: no
* KO Predictor touched: yes — teaser/readiness/routes and separate league collection only; no KO
  scoring, save or lock contract changed
* Production config touched: no

### 7. Visual review needed

Check Home, Groups, Original Bracket, Leagues, Results, Leaderboards, Match Centre, quick player
sheet and full Player View at phone/tablet/desktop widths in both themes. Verify the bottom bar hide/
reveal motion, next-match landing, embedded score controls versus card links, separate Original/KO
league tabs and empty state, bracket path emphasis, sticky Match Centre controls, keyboard focus,
long names, and reduced motion. Owner visual approval remains required.

### 8. Errors / blockers

Local Playwright Chromium is unavailable and its browser CDN download is blocked in this
environment, so a local screenshot gallery could not be rendered. The GitHub visual workflow is
installed to perform that check on a runner. This is not a test/build failure, but it blocks final
visual approval here.

### 9. Deferred findings

Pinned-rival persistence and cross-surface placement, the fuller dynamic Results impact story and
any owner-requested visual polish remain later Product Experience v3 slices.

### 10. Commit readiness

Say one of:

`Not ready — manual browser review and owner visual approval remain`
