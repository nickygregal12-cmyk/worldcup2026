# EURO 2028 PREDICTOR
## Design Charter
### Version 1.14 — Approved page visual contracts recorded

> **Authority:** This document governs how the Euro 2028 Predictor looks and feels. The Consolidated Decision Register governs product rules. The Agent Rules govern build process. A visual deviation must be proposed here before it ships.

## 1. Identity — CONFIRMED

The product name is **Euro 2028 Predictor**.

It has its own identity and must not imitate official UEFA branding, logos, typefaces or trade dress. It is also not a WC26 reskin. The exact WC26 Saltire palette, header gradient, DM Sans and DM Mono treatment are retired for this product.

### Blue direction — CONFIRMED

Euro 2028 uses an independent blue visual direction. Blue itself is not locked permanently: every colour is controlled through semantic variables in one file, `src/design/tokens.css`.

Changing the future palette must mean editing that token file and updating this charter—not rebuilding cards, navigation or page components. No raw hex, RGB, HSL or named colour may appear in active component or page styles.

## 2. Principles — CONFIRMED

1. **Mobile-first and thumb-first.** Design at 380px first. Interactive targets are at least 44×44px.
2. **One design language everywhere.** Home, predictions, leagues, admin, errors and dialogs share the same tokens and components.
3. **Match-night legibility.** Calm information density, strong hierarchy and large tabular numbers.
4. **State is always visible.** Saved, saving, submitted, locked, grace, upcoming, live, finished and joker states are explicit.
5. **Predicted and live contexts stay distinct.** The UI must never visually blend the original predicted bracket with the live bracket or KO Predictor.
6. **Light and dark are first-class.** Both themes use the same semantic tokens and component rules.
7. **Accessible by default.** WCAG AA contrast, visible focus, semantic HTML, labelled inputs and reduced-motion support.
8. **Everything has a designed home.** No capability is attached to an arbitrary page because it lacks an information-architecture owner.
9. **Shared identities behave the same everywhere.** Team and player names use one activation primitive each; screens do not invent local alternatives.

## 3. Token architecture — CONFIRMED

- One source of colour truth: `src/design/tokens.css`.
- Approved font-family declarations live in `src/design/typography.css`; other active styles use the typography tokens.
- Light theme on `:root`; dark theme on `:root[data-theme='dark']`.
- Tokens are semantic: `--surface-raised`, `--text-secondary`, `--state-live`, `--joker`.
- Active stylesheets may use only `var(...)`, `currentColor`, `transparent` and colour mixing from semantic tokens.
- `scripts/check-design-tokens.mjs`, included in `npm run check`, rejects raw colours, retired active imports, undefined variables and unapproved font declarations.
- `src/styles/globals.css` remains inactive inherited WC26 code and may not be imported by new Euro code. It will be deleted when the final inherited screens are rebuilt.
- The Stage 12 stopgap `src/foundation/foundation.css` is retired in Stage 13A. Compatibility styling for proven features is tokenised until those screens are rebuilt.

## 4. Colour roles — CONFIRMED STRUCTURE, VALUES ADJUSTABLE

The current direction uses deep blue emphasis, brighter blue actions and neutral cool surfaces. Exact values are intentionally editable in the token file.

Status colours are separate semantic roles:

- `--state-success`: correct or successfully saved.
- `--state-warning`: attention or grace.
- `--state-danger`: wrong, error or destructive action.
- `--state-live`: live match only.
- `--state-locked`: locked prediction state.
- `--joker`: reserved exclusively for jokers.

Gold must not be used for unrelated decoration.

## 5. Typography — CONFIRMED

- Display and headings: **Space Grotesk**.
- Body and interface: **Inter**.
- Both are self-hosted through `@fontsource`; no match-night CDN dependency.
- Scores, ranks, points and countdowns use `font-variant-numeric: tabular-nums`.
- Type sizes and line heights are defined once as tokens.

## 6. Space, shape and motion — CONFIRMED

- Spacing uses a 4px scale: 4, 8, 12, 16, 24, 32 and 48px.
- Radii: 6px, 10px, 16px and full.
- Exactly three elevation tokens: `--shadow-1`, `--shadow-2`, `--shadow-3`.
- Design widths: 380, 640, 900 and 1200px.
- Motion: 150ms micro, 250ms panels, 350ms sheets. Reduced-motion preferences override animation.

## 7. Navigation — CONFIRMED

Mobile uses five positions with Home centred, slightly larger and raised above the bar. Position 2 is permanently Bracket. Position 1 changes from Groups to KO only at the full readiness boundary below.

### State 1 — no display-ready Round of 16 fixture

**Groups | Bracket | Home | Leagues | More**

- Groups remains Position 1.
- Bracket remains Position 2.
- The active KO workspace is unavailable.
- More contains a deliberate KO explainer teaser describing what the separate competition is and when it opens.
- The teaser contains no unresolved fixtures, score inputs or false access.
- Home gives KO at most modest secondary prominence and does not let it compete with the Original Predictor.

### State 2 — early KO access

The five primary positions remain:

**Groups | Bracket | Home | Leagues | More**

- Early access begins once at least one Round of 16 fixture has both participant slots resolved.
- More contains KO Predictor.
- Only complete real pairings are shown; TBC, partial and unresolved fixtures are hidden.
- Groups remains Position 1 even if the group stage is complete but the full Round of 16 is not ready.
- Bracket remains Position 2.

### State 3 — KO becomes Position 1

**KO | Bracket | Home | Leagues | More**

Position 1 changes only when all 36 group matches have authoritative completed results, final standings are confirmed, all eight Round of 16 fixtures have both participant slots resolved, and the canonical resolver has no unresolved best-third or bracket-allocation error.

After the switch:

- the Position 1 label, icon and destination change together;
- Groups moves to More as **Group stage review** and remains permanently reachable;
- Bracket remains Position 2 and never changes destination.

The lifecycle is driven by central competition readiness and canonical resolver state, never a hardcoded calendar date inside a component. Desktop navigation preserves the same distinction.

### More curation — CONFIRMED

More is grouped and phase-aware rather than a flat accumulation list.

- Before the tournament: Tournament, How to Play, Results, Leaderboards, KO explainer, Account, Appearance, then authorised Admin.
- During the group stage: Results, Leaderboards, Tournament, How to Play, KO explainer, Account, Appearance, then authorised Admin.
- Early KO access: KO Predictor first, then Results, Leaderboards, Tournament, How to Play, Account, Appearance and authorised Admin.
- Full KO readiness: Group stage review first, then Results, Leaderboards, Tournament, How to Play, Account, Appearance and authorised Admin.

Admin is visually separated and never appears for an unauthorised user.

## 8. Icons — CONFIRMED

**Lucide** is the single source for ordinary interface icons. It provides consistent SVG line icons while allowing only used icons into the production bundle.

Custom assets are reserved for:

- ISO-keyed circular team flags;
- a future independent app mark;
- the joker symbol.

Icons supplement readable labels and accessible names; colour or icon alone never communicates essential state.

## 9. Component standards — CONFIRMED

Every shared component supports both themes and its loading, empty, error, disabled and focus states where applicable.

- Buttons: primary, secondary, ghost and destructive; loading preserves width.
- Cards: one nesting level, consistent mobile and desktop padding.
- Badges: icon plus label; status colour is never the only signal.
- Dialogs and sheets: focus trapped, Escape closes, focus restored, background scroll locked; mobile uses bottom sheets.
- Loading, empty, error and partial-failure states are designed rather than improvised.
- Any player name uses the shared player identity activation primitive and opens the same authorised overview.
- League invite copy uses one shared action with copied, failed and retry states.
- The Stage 13B score input will use a mobile numeric keypad, clear saved/saving state and an unmistakable read-only locked state.

## 10. Football conventions — CONFIRMED

- One future `<TeamLabel>` component displays circular ISO-keyed flags and team names.
- Placeholder slots use neutral dashed chips and remain visibly different from real teams.
- Match cards use one anatomy across contexts.
- A joker is shown with the reserved joker treatment.
- Predicted and live bracket screens carry different context banners.
- Original Predictor and KO Predictor leaderboards remain visual siblings but never display a combined score.
- Upcoming playable/viewable matches order by next real kick-off. Completed results order most-recent-first.
- Group-stage fixtures support By group and By date views using the same match-card primitive.
- Tournament rules and displayed point values render from central versioned contracts/configuration rather than duplicated prose.
- Tournament and How to Play split — CONFIRMED: football tournament reference content and predictor mechanics must not be bundled into one destination.

### 10A. Information architecture and coherent surfaces — CONFIRMED

- Direct destinations own complete user intentions; contextual surfaces remain attached to the object that opens them.
- Match Centre, Team Profile, Player Overview, H2H and Bracket Health do not become unrelated permanent navigation items.
- Unknown routes use an explicit recovery state rather than silently pretending to be Home.
- Destination labels, descriptions, categories and lifecycle visibility live in one registry.
- Tournament is a key casual-player destination for football facts; How to Play is a separate key destination for predictor mechanics, scoring, locks and FAQ.
- Static Open Graph metadata uses Euro identity assets. Dynamic league previews may expose only the league name and generic product copy.
- Every Stage 13G build batch re-baselines affected screens at 380, 768 and 1200 pixels in both themes.

## 11. Frontend architecture and enforcement — CONFIRMED

This section restores the confirmed architecture rules lost during the uncommitted Stage 13A v5 to committed v6 reconciliation. It may not be removed, weakened or replaced without Nicky's explicit approval, a Charter version change and a change-log entry.

### 11.1 Component ownership

Each new or materially reworked interface component lives in an identifiable component or feature folder with its component, scoped stylesheet and tests where applicable. Large pages compose smaller feature components rather than retaining every state, action and layout in one file.

### 11.2 Scoped styling

CSS Modules are the default and required styling mechanism for all new components and all materially reworked components.

Permanent global CSS is limited to:

- semantic tokens;
- approved typography declarations;
- browser reset and genuinely application-wide base behaviour.

Page, feature and component selectors are not permitted in new permanent global stylesheets.

### 11.3 Transitional global-style bridge

The following exact ceilings are temporary compatibility debt, not budgets:

- `src/styles/feature-compat.css`: 2,590 lines;
- `src/styles/app.css`: 1,906 lines;
- `src/styles/groups-predictor.css`: 603 lines;
- `src/styles/knockout-experiences.css`: 463 lines.

They must not grow. New feature selectors are forbidden. When a file shrinks, its audited cap shrinks in the same commit. A cap increase or a new exception requires explicit approval. The allowlist must eventually become empty.

### 11.4 File-size boundaries

For React interface components:

- approximately 200 lines is the review target;
- 400 lines is the hard limit.

For scoped stylesheets:

- approximately 250 lines is the review target;
- 400 lines is the hard limit.

The architecture audit fails on a breach. Temporary exact caps may exist only for named transitional files and may ratchet down only. The hard cap also applies to test fixtures; any over-cap fixture must be named, capped exactly and reduced when touched.

### 11.5 Dependency direction

Dependencies must flow in one direction:

1. application composition and routing;
2. feature public entry points;
3. feature interface components;
4. feature models and service contracts;
5. shared pure utilities and the design system.

The design system may not import application routes, feature components, Supabase clients or feature services. Models and services may not import React components or CSS. Features may not reach into another feature's internal files where a public entry point is required. Active Euro code may never import quarantined WC26 pages, components, stores, hooks or global styles.

### 11.6 Development and test isolation

Development and automated-test fixtures must not be statically imported by the production application root. Production builds must contain no activation query, sample account or fixture dataset capable of changing ordinary application behaviour. Stage14ErrorFixture is the only root-mounted error-boundary fixture and must be gated to `import.meta.env.DEV`, not to deployable VITE flags.

The two current visual-fixture imports are recorded temporary debt. They may not increase and must be removed from the production graph before Stage 15 is accepted.

### 11.7 WCAG contrast enforcement

Every approved foreground/background token pairing is registered for light and dark themes.

The design-token audit checks:

- normal text at 4.5:1;
- large text at 3:1;
- meaningful controls, boundaries and focus indicators at 3:1;
- status, joker, link, predicted-context, real-context and action pairs.

Known failures at checkpoint `d522210` are explicit ratcheted exceptions. They may not worsen and must be removed before Stage 14B is complete. A new token or pairing is incomplete until its contrast test is registered.

### 11.8 Architecture audit

`npm run check` includes an architecture audit covering:

- component and stylesheet sizes;
- exact transitional caps;
- scoped-style ownership;
- dependency direction;
- the WC26 quarantine boundary;
- production fixture imports;
- preservation of this Charter section;
- WCAG token-pair verification in both themes.

### 11.9 Completion terminology

A stage is **implemented** when its code and automated gates exist. It is **accepted** only when every required owner-side and deployed check has evidence. A deferred acceptance item must name its later owning stage. A stage with required but unevidenced acceptance must not be recorded simply as complete.

## 12. Visual verification — CONFIRMED

Each Stage 13 batch stores baselines in `docs/design-baselines/` at:

- 380px light and dark;
- 768px light and dark;
- 1200px light and dark.

The staging preview remains the sign-off surface for future palette refinements. A palette change is a token edit plus charter version bump, not a component rewrite.


## 12A. Visual contracts — CONFIRMED

A visual contract is an approved, self-contained HTML reference prototype stored under `docs/reference-prototypes/` and recorded in this Charter, the Decision Register and the Functional Completion Ledger. It is binding for layout, hierarchy, visual treatment, state coverage and page-level composition, but it is not production code and must not be ported directly into `src/`.

Visual-contract rules:

- Candidate prototype files are explorations until Nicky approves one variant or an explicitly merged variant.
- Once approved, exactly one contract file is retained per surface; approved files supersede older references rather than accumulating alternatives.
- Product implementation must rebuild the approved contract natively in the Euro design system using real components, semantic tokens, scoped CSS Modules and existing models/contracts.
- Prototype HTML, inline CSS, sample JavaScript, hardcoded sample data, demo toggles, CDN fonts, local switches and fake storage are reference-only and must not be imported into the app.
- Every candidate file must list preserved functional decisions in an HTML comment at the top before page markup.
- A visual idea that requires an unrecorded behaviour, scoring rule, route, data read/write, moderation rule or auth change must be flagged as a proposed decision in the batch summary and must not be silently designed as accepted.
- Visual contracts never override the Consolidated Decision Register, database contracts, scoring contracts, resolver contracts, privacy gates, public-signup gates or the Original/KO competition boundary.
- Cosmetic implementation stages under an approved visual contract must be sequenced behind any recorded missing functional rows for that surface; visual polish must not jump the correctness queue.
- The approved Groups Night Broadcast direction is the identity anchor for this programme. Groups must not be redrafted unless Nicky explicitly reopens that surface.
- The supplied League visual contract is also approved. Leagues must not be redrafted unless Nicky explicitly reopens that surface.
- League table D is the approved Leagues refinement: compact Match Centre at the top, full-row clickable user rows, subtle chevrons, and movement arrows.
- Bracket G is the approved Original Bracket visual contract: mobile stacked view, proper ≥900px wall chart, Round of 16 on outside edges, quarter-finals and semi-finals stepping inward, centre final, small slick `vs`, and date/time/stadium/host-flag match detail.
- KO Predictor F is the approved KO Predictor visual contract: teams pending before real fixtures are known, real fixtures once ready, 90-minute score, advancing team, method and five separate KO jokers.
- Bracket Health remains unapproved and must be redrafted separately around `your predicted route vs the real route` before any implementation.
- Light and dark theme treatment, realistic long-content states, loading/empty/partial states and hard-case football content are part of the approval standard, not optional polish.

The design-contract drafting programme is docs/reference-only until a later separately approved implementation stage. It authorises no product-code change, no route change, no scoring or resolver change, no Supabase write, no Auth configuration change and no migration. Active migrations remain 18 and Migration 019 must not be created by visual-contract work.

## 13. Deferred design decisions

- Final app mark or wordmark treatment beyond the confirmed name.
- Exact future blue values if the staging preview is refined before 2028.
- **DECIDED — Share Card:** the Share Card is the user’s completed bracket rendered from the Stage 13P-A converging wall-chart layout in the Euro 2028 Predictor identity as a shareable/downloadable image. It is not a separate design or bracket implementation; only its scheduled implementation remains deferred.

## Change log

- **v1.14:** Recorded Bracket G and KO Predictor F as approved visual contracts, recorded League table D as the approved Leagues refinement, and left Bracket Health unapproved for a later candidate.
- **v1.13:** Recorded the approved League visual contract alongside the approved Groups Night Broadcast anchor; clarified that Bracket and KO Predictor remain unapproved candidates until Nicky approves a variant or merge.
- **v1.12:** Recorded the visual-contract rule: approved self-contained HTML references become binding layout/hierarchy/state contracts, but are not code to port; one approved contract is retained per surface; Groups Night Broadcast remains the identity anchor; visual work cannot override functional decisions, signup gates, migrations, scoring, resolver or Original/KO boundaries.
- **v1.9:** Approved the holistic Stage 13G information architecture, phase-aware More strategy, KO teaser, real-time match ordering, shared group views, canonical rules guide, global player identity activation, league invite previews and seeded coherence acceptance.
- **v1.0:** Fresh identity proposed; green/lime palette and typography provisional.
- **v1.1:** Blue direction confirmed; colours centralised and intentionally adjustable; app name confirmed; five-position navigation fixed; Lucide and typography confirmed.
- **v1.3:** Made Bracket permanent and reversed the phase-aware destination so Groups becomes KO.
- **v1.4:** Confirmed early KO access through More and the full Round of 16 readiness trigger; unresolved fixtures stay hidden.
- **v1.5:** Stage 13B implements shared TeamLabel, local flags, unresolved slots, score input, prediction states and gold-only joker treatment.
- **v1.6:** Stage 13C separates the predicted Original Bracket from the real-fixture KO Predictor.
- **v1.7:** Restored frontend architecture enforcement omitted during Stage 13A reconciliation; added scoped styling, size limits, dependency direction, fixture isolation, WCAG contrast checks and explicit implementation-versus-acceptance terminology.
- **v1.8:** Settled the Share Card as the completed converging wall-chart bracket rendered to an image and scheduled the presentation-only layout for Stage 13P-A.

## Bottom navigation Home-circle alignment clarification

The centred Home circle sits slightly above the bar's top line, but all five items' icons and labels remain vertically aligned with each other. The circle overlaps the line; the Home button does not float above its siblings.

## Stage 13G-BRACKET-REF — Original Bracket Reference Adoption

The Original Bracket now has an accepted Stage 13G responsive contract: below 900px it uses the vertical stacked layout with per-round pick counters, and at ≥900px it uses the converging wall chart with R16 outer wings, inward QF/SF columns, final and champion centred. This brings the charter v1.8 wall-chart decision forward from backlog into Stage 13G and is recorded as a contract change.

The Bracket must use one state and one set of tie/slot primitives across both arrangements. Slot source codes such as `1B`, `2A` and `3DEF` are visible. Original Bracket remains winner-only and tap-to-advance. The only KO Predictor mention on this page is: `winner picks only — scores and jokers are handled in the KO Predictor`.

The predicted-context banner is: `Your group predictions decide this bracket. Live results will not change your saved picks.`.

Compliance by absence is part of the charter: no score inputs, no method controls and no joker controls on Original Bracket. First implementation proceeds without connector lines, with share-card image rendering deferred to its own batch, and with a single 900px breakpoint.


- Tournament is a key casual-player football-facts destination, not a technical summary page. How to Play is a separate mechanics lookup destination.

## Stage 13G-ACCOUNT-1 Account destination note

Account follows the Stage 13G destination reference pattern: useful signed-in state first, no persistent guest-transfer card, calm security/preferences rows and destructive actions isolated in a danger zone. Coming-soon notification rows must not imply active notification functionality.


## Stage 13G-ADMIN-1 — Admin control-room cosmetic restyle — CONFIRMED

Stage 13G-ADMIN-1 Admin control-room cosmetic restyle uses the approved Admin prototype as a cosmetic reference for shell hierarchy, compact section navigation, role/metadata chips, status cards, high-impact guardrail copy and audit filter pills. The adoption is visual only: Admin authorisation, section routing, operation contracts, audit records, Tournament Picks readiness and database boundaries are not product-design variables and must not be loosened for presentation polish. Active migrations remain 18 and Migration 019 must not be created for this cosmetic stage.


## Stage 13G-MATCH-CENTRE-REF — Match Centre group-match reference adoption

The Match Centre group-match reference is accepted as design guidance for the next implementation slice. Group fixtures must feel specific to the fixture and group: Original Predictor only, `Live projection` or `Final` group-impact state, read-only projected/confirmed bracket-point context and `This match’s predictions` comparison. Knockout fixtures keep the existing Original/KO separation and `Points on the line` panel. Match Centre projections are labelled as projections, reuse `resolveGroupTable`, never blend predicted and live brackets, and never alter saved Original Bracket state. Active migrations remain 18 and Migration 019 is not a presentation requirement. `13G-MATCH-CENTRE-1` remains the separate implementation stage after this reference adoption.

## Stage 13G handover design checkpoint

Tournament/How to Play, Account and Admin now follow the Stage 13G destination-reference pattern. Match Centre and Player View remain contextual destinations, not permanent bottom-nav items. User-facing surfaces carry zero admin, dev or build-internal language and never echo spec/decision-doc prose verbatim. Copy is written for the player reading it, not lifted from the requirement that produced it.

Match Centre group-match projections, when built, must be labelled as projections and must not alter the saved Original Bracket or blend predicted and live bracket contexts. Player View, Head-to-head and Points Breakdown must preserve Original/KO separation and reuse the existing comparison and points engines.



## 15. Locked visual contracts and dynamic behaviour — CONFIRMED

`CONTRACTS-REF-LOCKED-SURFACES-3` records the current v9 approved reference library. The installed visual contracts cover Groups, Leagues, Original Bracket, KO Predictor, Home, Match Centre, Player View, Points Breakdown, Account, Tournament Overview, How to Play / Rules Hub, Admin Control Room, Results, Leaderboards, Offline Player Claim, Bracket Health, Team Profile Sheet and Shared States.

Every page must feel like the same Euro 2028 Predictor product. Content may change by destination, but chrome, hierarchy, card language, type scale, Night Broadcast tone, semantic token usage and interaction affordances must stay coherent.

A page matching the visual reference is not enough if it briefly shows the wrong CTA, lock state, account state, guest warning, competition state or navigation action before settling. Dynamic pages must either render the correct state immediately or show a neutral shimmer/skeleton/settling state until canonical state is known.

Every contextual route, sheet, modal or detail surface opened from a known origin must provide a clear way back to that origin. This applies to click-through journeys, not ordinary bottom-nav movement.

The reference library must keep one approved visual contract per surface. If a later candidate supersedes an existing surface, it replaces the existing reference file at that surface's existing filename. New filenames are allowed only for genuinely new surfaces.
