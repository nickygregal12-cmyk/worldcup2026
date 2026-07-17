# Stage Order

## Current Priorities

- Current product priority: adopt and implement the owner-approved final Product Experience in
  controlled, visually reviewed batches without changing the existing scoring or competition rules.
- Current implementation checkpoint: the final contract is the sole visual/product-experience
  authority. Earlier Product Experience v3 work remains production code to improve, not a competing
  design authority.
- Current implementation batch: the shared Tournament/qualification compound is in the working
  tree, passes the full automated review and awaits owner visual review. Groups, Results and Tournament now share
  the six-team third-place presentation and existing ISO-keyed flag identity.
- Next visual batch after acceptance: finish Teams/Team Profile and the remaining Groups tracking
  states before proceeding to Bracket Health and Leagues.
- Prediction-save conflict-loop repair remains a separate high-care stage with a fresh backup.
- Scoring, resolver, Auth, public signup and migrations remain out of scope unless explicitly opened.

## Recommended Near-Term Order

1. `STAGE-REPO-CONTROL-1A-AGENT-RULES-AND-DOC-AUTHORITY-MAP`
2. `STAGE-CORE-PAGE-ADOPTION-1B-ORIGINAL-BRACKET-GRID-NATIVE-CONNECTORS` targeted verification/fallback repair
3. `STAGE-REPO-CONTROL-1B-AUDIT-AND-DOC-RETIREMENT-PLAN`
4. `STAGE-REPO-CONTROL-1C-CHECK-CHAIN-SPLIT`
5. archive historical docs only after the ledger preserves their proof
6. narrow Playwright visual baseline
7. continue feature/design/product-flow fixes

## Superseded Design Programme (DP) stage plan — installed 2026-07-10

The final Product Experience supersedes this programme as the current visual/product-experience
authority. The
completed plan is retained here as implementation history and as evidence for already-landed
architecture. New work follows `docs/reference-prototypes/euro28-product-experience-final.md` while
preserving existing functional contracts. Every per-page re-cut stage below originally inherited the
**per-page finalisation standard by reference** (recorded 2026-07-09): each exits FINAL — flaws
fixed in-stage, CSS modularised in-stage, no scaffold UI, fail-loud provisional indicators are
features and stay; exit = owner gallery approval → visual blessing (once the Playwright visual
tier is present) → FINAL. Appearance only — no functional change beyond what each stage records.

Order:

1. **DP-0 — Tokens and fonts first.** Self-host fonts via `@fontsource` (no runtime Google Font
   requests in product code; prototypes/artifacts may keep the CDN). Author the full light
   palette including the **F1 ink variants** (~6–12% darker text at the same hues; originals stay
   for fills/chrome) and the **F3 `text-muted-on-chrome`** token; install the approved dark
   palette from `docs/design programme/Euro 2028 Predictor - Dark Theme Palette.html`; install the
   4px spacing scale with the compact bias. **`src/design/tokens.css` line-cap ratchet exception:**
   the full palette will exceed the current stylesheet cap; this is an explicit **owner-approved
   §5.8 decision** (ratchet may loosen only by explicit owner decision recorded in the code and the
   commit) — record the raised cap in the audit and the commit message when DP-0 lands. Retire the
   concepts' improvised muted/border values (F6) via per-page extraction; no bundle re-render.
2. **DP-SCORING — Scoring runtime alignment onto the locked contract** (schedule with or before the
   first surface that displays points, i.e. Groups). This is the pending runtime migration the
   2026-07-10 sweep deferred — it is a functional change and moves as ONE scoped, owner-evidenced
   stage (Constitution §4.6: scoring values are never changed silently). It repoints, together:
   `src/config/scoringConfig.js` (EXACT_SCORE 30→5, CORRECT_OUTCOME 10→3, bracket ladder →
   R32 5 / R16 8 / QF 12 / SF 15 / Final 20 / Champion +25 per the locked contract, KO advancing
   10→5), `src/contracts/tournamentPickContract.js` (flat-20 → Top Scorer 30 + tiered group-goals
   25/15/5; **remove `highest_scoring_team` entirely**), `src/admin/AdminTournamentPicks.jsx`, every
   pinned test/fixture (`src/testFixtures/stage13dVisualFixture.js`, `src/config/__tests__/`,
   `src/contracts/__tests__/tournamentPickContract.test.js`, `src/player/__tests__/*`,
   `src/results/__tests__/resultModel.test.js`), and the two audits that currently pin the old
   values (`audit:tournament-picks`, `audit:rules-scoring-lock`) plus the audit-pinned docs
   (STAGE-13F-I, the ledger, agent-rules). Until this stage lands, the docs record the locked
   contract as the authority and the code remains provisional (`euro28-scoring-provisional-v2`).
   **Flag (advisory, do not resolve here):** CLAUDE.md §4 says SF = 16 while the locked contract and
   every current lock artifact/audit say SF = 15 — an owner ruling is required before this stage
   picks a value.
3. **Home re-cut** — input is the approved `docs/design programme/euro28-home-recut-prototype-PROPOSED.html`.
4. **Groups re-cut** (DP-SCORING and item 64's model change land with or before this).
5. **Original Bracket re-cut.**
6. **Leagues re-cut.**
7. **Remaining pages** grouped sensibly (Results, Leaderboards, Match Centre, Player View, Points
   Breakdown, KO Predictor, Account, Tournament, How to Play, Team Profile, Bracket Health, Shared
   States, Welcome, Guest Transfer, Offline Player Claim, Head-to-Head, Admin), each carrying its
   reference-prototype content/interaction contract forward and the contract-wins list (CW1–CW6).

Named stages folded into the plan:

- **DP-PRIMITIVES — shared-primitives component stage (backlog items 63/64/65/66).** The
  `SelectField` custom-rendered control (migrating to `SelectField` does NOT remove the OS picker;
  a custom control is a required stage before any dropdown-migration claim) and the Prediction
  Input Row primitive (vertical steppers above/below each score + direct numeric entry, 48px
  targets; the 7+ typed-only shown-once high-score confirm; the tiebreak-warning trigger). Build
  primitives before the screens that consume them. **Item 64's model change is scheduled with or
  before the Groups re-cut.**
- **DP-BUILD-COMPLETENESS — build-completeness backlog.** Item 26 admin controls plus add-admins;
  grace-for-late-joiners wiring; the Head-to-Head upgrade. These are functional and sequenced
  outside the appearance-only re-cuts.
- **DP-SYNC / item 69 — later stages.** The Mac-stranded documentation-constitution consolidation
  and item 69's doc-hygiene sweep re-home the design-programme registration under the constitution
  when they sync; the narrow Playwright visual tier (Mac-stranded) becomes the "visual blessing"
  gate in the finalisation standard once present. Backlog item numbers 26/63/64/65/66/69 are the
  owner's master-backlog identifiers and are not otherwise present in this tree (Mac-stranded).
