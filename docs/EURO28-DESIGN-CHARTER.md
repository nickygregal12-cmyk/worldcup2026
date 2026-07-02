# EURO 2028 PREDICTOR
## Design Charter
### Version 1.4 — Blue identity and confirmed three-state navigation lifecycle

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
- KO Predictor is absent from More.

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
- The Stage 13B score input will use a mobile numeric keypad, clear saved/saving state and an unmistakable read-only locked state.

## 10. Football conventions — CONFIRMED

- One future `<TeamLabel>` component displays circular ISO-keyed flags and team names.
- Placeholder slots use neutral dashed chips and remain visibly different from real teams.
- Match cards use one anatomy across contexts.
- A joker is shown with the reserved joker treatment.
- Predicted and live bracket screens carry different context banners.
- Original Predictor and KO Predictor leaderboards remain visual siblings but never display a combined score.

## 11. Visual verification — CONFIRMED

Each Stage 13 batch stores baselines in `docs/design-baselines/` at:

- 380px light and dark;
- 768px light and dark;
- 1200px light and dark.

The staging preview remains the sign-off surface for future palette refinements. A palette change is a token edit plus charter version bump, not a component rewrite.

## 12. Deferred design decisions

- Final app mark or wordmark treatment beyond the confirmed name.
- Circle-flag artwork and `<TeamLabel>` implementation in Stage 13B.
- Share-card mini-spec before Stage 13D.
- Exact future blue values if the staging preview is refined before 2028.

## Change log

- **v1.0:** Fresh identity proposed; green/lime palette and typography provisional.
- **v1.1:** Blue direction confirmed; colours centralised and intentionally adjustable; app name confirmed; five-position navigation fixed; Lucide and typography confirmed.
- **v1.3:** Made Bracket permanent and reversed the phase-aware destination so Groups becomes KO.
- **v1.4:** Confirmed early KO access through More and the full Round of 16 readiness trigger; unresolved fixtures stay hidden.
