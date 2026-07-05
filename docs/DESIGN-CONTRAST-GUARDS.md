# Design contrast guards — why the Home page shipped unreadable, and the tests that stop it

Date: 2026-07-05
Trigger: Home hero screenshot — subtitle, countdown labels and timeline captions near-invisible in BOTH themes.

## Root cause (verified in source)

The ledger's "WCAG token contrast audit — all 58 registered pairs pass" is true and insufficient:
it validates the PALETTE, never the USAGE. Two usage errors passed straight through it:

1. `color: var(--surface-inverse-soft)` on the hero subtitle, tournament-card note and lifecycle
   strip — a SURFACE token used as a text colour. Light-theme value #0d2b55 (dark navy) painted
   onto the hero's dark navy gradient.
2. `--text-secondary` inside the hero (`.home-stat` labels). The hero background is polarity-
   inverted (dark in light theme via --surface-inverse #07172f, LIGHT in dark theme via #dcecff)
   while --text-secondary inverts the same direction — so the pairing fails in both themes
   (~2:1 light, similar dark). This is why the page "doesn't work in light or dark".

## New guard: `check-token-contrast-usage.mjs` (static, wire into check immediately after fixes)

Three rules over every current and future stylesheet:
- Rule A — category guard: `color:` may never use a `--surface-*` token.
- Rule B — inverse-context contrast: selectors scoped (by selector or BEM block__element naming)
  to a class painting an inverse/brand background must pass 4.5:1 against the base gradient's
  WORST endpoint, in both themes. Decorative `color-mix(..., transparent)` glow layers are
  stripped (with nested-paren handling) so only real surfaces are judged.
- Rule C — same-block background+colour token pairs must pass 4.5:1 in both themes.
Exceptions require ALLOWED_PAIRINGS entries (file + selector + token + reason).

Validated first run: 12 raw -> 7 findings after removing two false-positive classes
(decorative glow layers; body radial). All 7 confirmed genuine:
- 5x surface-token-as-text: .home-hero__content > p, .home-tournament-card > p,
  .lifecycleStrip small (the screenshot bugs), .skip-link, .joker-control__multiplier
- 2x marginal AA fails at 4.26:1: .team-label__flag, .joker-control:disabled
  (--text-muted on --surface-sunken)

## Recorded static limit -> the completing runtime guard

`.home-stat` has no selector/BEM link to `.home-hero`; the JSX puts it there. No static CSS
analysis can bind it. The completing class guard is the runtime contrast walk, which should be
specced as its own stage (fits the Playwright baseline pipeline the governance docs already
promise):

**Stage spec sketch — route contrast walk:** Playwright boots the built app against staging
fixtures; for each route in APP_ROUTE x {light, dark}: walk visible text nodes, read computed
color, composite effective background by ancestor sampling (element screenshot pixel sampling
for gradients), assert >= 4.5:1 (3:1 for >= 24px/18.7px-bold), emit an allowlist-keyed report.
This subsumes rules A-C at runtime and also catches JSX-composed cases, translucent card
stacking and theme-toggle regressions. Run in CI/postdeploy verify, not in the fast check chain.

## Fix path for the current findings

The ledger already schedules "Home theme compliance sweep" (13G-E). Fold in:
1. Swap the three surface-as-text usages to an on-inverse muted token — add `--text-on-brand-muted`
   (light: rgba/white-mix ~#b9c8de; dark: ~#3c5570) to tokens.css and the registered-pair audit.
2. Re-token `.home-stat` labels inside the hero to on-brand tokens (or scope hero stats with a
   hero-owned class so Rule B binds them statically too).
3. Nudge --text-muted or --surface-sunken so the 4.26:1 pairs clear 4.5:1, or record 3:1
   large-text exceptions with evidence.
4. Wire `audit:token-contrast-usage` into check in the same commit the findings go green.

## Stage 13G-E implementation note

Stage 13G-E fixes the seven validated static findings and wires `audit:token-contrast-usage` into the normal check chain.

Implemented changes:
- Home hero subtitle, tournament-card note and lifecycle-strip captions now use `--text-on-brand` instead of a surface token.
- The skip link and joker multiplier no longer use surface tokens as foreground colours.
- The flag placeholder and disabled joker control use `--text-secondary` on `--surface-sunken`, clearing the 4.5:1 static usage audit in both themes.

This is still a fast static guard. The runtime route contrast walk remains a separate future browser-level guard for JSX-composed contexts that CSS selector analysis cannot bind statically.
