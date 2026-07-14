export const FRONTEND_COMPONENT_REVIEW_TARGET = 200
export const FRONTEND_STYLESHEET_REVIEW_TARGET = 250
export const FRONTEND_COMPONENT_HARD_CAP = 400
export const FRONTEND_STYLESHEET_HARD_CAP = 400
export const FOUNDATION_CLASS_RATCHET_CAP = 245

export const ACTIVE_UI_ROOTS = Object.freeze([
  'src/app',
  'src/design-system',
  'src/home',
  'src/tournament',
  'src/auth',
  'src/guest',
  'src/predictions',
  'src/journey',
  'src/koPredictor',
  'src/grace',
  'src/results',
  'src/matchCentre',
  'src/bracketHealth',
  'src/player',
  'src/teamProfile',
  'src/observability',
  'src/admin',
  'src/leagues',
  'src/runtime',
])

// Temporary caps are exact ceilings. If a file shrinks, this policy must shrink in the same commit.
export const TEMPORARY_COMPONENT_CAPS = Object.freeze({})

// Permanent global CSS is limited to tokens and typography. The compatibility files below are frozen debt.
//
// match-card.css: HALF-RETIRED at Stage DP-HOME (186 -> 90). Home stopped using the shared MatchCard
// and renders its own ticket card from src/home/HomeMatchCard.module.css, so the Home-only rules
// (--readonly/--tappable, the centre, the status chips, the pulse, the Match Centre hint) lost their
// last caller and were deleted. What remains is the card shell that Groups, Leagues and the two
// matchday hubs genuinely share, so the registration CANNOT be retired outright from a Home stage —
// the remaining 90 lines belong to those surfaces and fold into a module when THEY are re-cut.
export const GLOBAL_STYLESHEET_CAPS = Object.freeze({
  // Raised 204 -> 301 at Stage DP-0 for the full Design Programme palette (light
  // + F1 ink variants + gap tokens + transcribed dark palette). Owner-approved
  // §5.8 ratchet exception, recorded in AGENT-CONTROL/09-STAGE-ORDER.md (DP-0).
  'src/design/tokens.css': 301,
  'src/design/typography.css': 12,
  // 2590 -> 2565 at the Groups re-cut: the dead Stage 8 joker rules
  // (.journey-joker-summary and children, .journey-joker-button, .journey-match-row--joker)
  // were deleted. Nothing composed those class names — the joker is a design-system
  // primitive now — so this is a deletion with no destination module.
  'src/styles/feature-compat.css': 2208,
  // 1903 -> 1517 at Stage DP-HOME: every home-* orphan is gone. Home now carries its own
  // CSS Modules, so the only survivor is .home-section-heading, which TournamentOverview uses.
  // 1517 -> 1461 at Stage DP-SHELL: the mobile bottom nav left. It was three near-duplicate
  // .app-mobile-nav blocks spread across two legacy media queries; it is now one CSS Module
  // (src/app/MobileNav.module.css) on DP tokens, which is where the raised Home circle and
  // the §5 auto-hide transform live. The cap comes down with the file, in the same commit.
  'src/styles/app.css': 1461,
  // 555 -> 385 at the Groups re-cut: TeamLabel, JokerControl (pill + meter) and
  // PredictionStateBadge left for their own --dp-* CSS Modules. They are shared
  // design-system primitives, not page styling, and three surfaces were reaching
  // into their global class names from the outside. The .score-input rules that
  // remain are dead (DP-PRIMITIVES moved ScoreInput to a module and left the
  // globals behind); removing them is legacy cleanup, reported not swept up.
  // 385 -> 291 at the DP Groups visual re-cut: the hero panel, its gradient, the
  // six-card jump rail and the stacked group sections left for CSS Modules
  // (GroupsPredictor.module.css + GroupsPredictorFlow.module.css), because new
  // component styling must be modular. What stays global is what has to be: the
  // `match-card__*` class names MatchCard emits cannot be reached from a module, so
  // the Groups overrides of them live here — plus PredictionReview's rules, which
  // belong to a page that has not been re-cut.
  // 291 -> 305 when the phone breakpoint bought the team columns their width back. The
  // rules have to be global: they override `match-card__*` class names MatchCard emits,
  // which a CSS Module cannot reach.
  'src/styles/groups-predictor.css': 305,
  // 463 -> 462: the two rules that reached into TeamLabel from a KO score row are
  // now TeamLabel variants (alignEnd, collapseCopy), passed by the caller.
  'src/styles/knockout-experiences.css': 462,
  // 90 -> 70: the team-label stacking block is now TeamLabel's `stacked` variant.
  'src/styles/match-card.css': 70,
})

// Test fixtures share the hard cap. Exact temporary caps must ratchet down when a fixture shrinks.
export const TEMPORARY_TEST_FIXTURE_CAPS = Object.freeze({
  'src/testFixtures/stage13dVisualFixture.js': 468,
})

// Production code must not import deterministic visual fixtures.
export const TEMPORARY_FIXTURE_IMPORTS = Object.freeze([])

export const CONTRAST_PAIRS = Object.freeze([
  ['text-primary', 'surface-page', 4.5, 'normal text'],
  ['text-primary', 'surface-raised', 4.5, 'normal text'],
  ['text-primary', 'surface-soft', 4.5, 'normal text'],
  ['text-primary', 'surface-sunken', 4.5, 'normal text'],
  ['text-primary', 'surface-emphasis', 4.5, 'normal text'],
  ['text-strong', 'surface-page', 4.5, 'strong text'],
  ['text-strong', 'surface-raised', 4.5, 'strong text'],
  ['text-strong', 'surface-soft', 4.5, 'strong text'],
  ['text-secondary', 'surface-page', 4.5, 'secondary text'],
  ['text-secondary', 'surface-raised', 4.5, 'secondary text'],
  ['text-secondary', 'surface-soft', 4.5, 'secondary text'],
  ['text-muted', 'surface-page', 4.5, 'muted text'],
  ['text-muted', 'surface-raised', 4.5, 'muted text'],
  ['text-muted', 'surface-soft', 4.5, 'muted text'],
  ['text-link', 'surface-page', 4.5, 'links'],
  ['text-link', 'surface-raised', 4.5, 'links'],
  ['text-on-brand', 'brand', 4.5, 'brand actions'],
  ['text-on-brand', 'brand-strong', 4.5, 'strong brand actions'],
  ['hero-action-text', 'hero-action-surface', 4.5, 'hero actions'],
  ['state-success', 'state-success-soft', 4.5, 'success text'],
  ['state-warning', 'state-warning-soft', 4.5, 'warning text'],
  ['state-danger', 'state-danger-soft', 4.5, 'danger text'],
  ['state-info', 'state-info-soft', 4.5, 'information text'],
  ['joker', 'joker-soft', 4.5, 'joker text'],
  ['predicted-context-text', 'predicted-context-surface', 4.5, 'predicted context'],
  ['real-context-text', 'real-context-surface', 4.5, 'real fixture context'],
  ['focus-ring', 'surface-page', 3, 'focus indicator'],
  ['focus-ring', 'surface-raised', 3, 'focus indicator'],
  ['focus-ring', 'surface-soft', 3, 'focus indicator'],

  // Design Programme palette (Stage DP-0). The --dp-* set lands alongside the
  // legacy tokens (above) and is pinned here so it is proven >=4.5:1 (text) /
  // >=3:1 (UI) in BOTH themes before any page adopts it. The F1 ink variants
  // are why the allowlist below stays empty — text uses the ink, never the raw
  // fill. Ratios: see the per-token comments in src/design/tokens.css.
  ['dp-text-body', 'dp-surface-page', 4.5, 'DP body text'],
  ['dp-text-body', 'dp-surface-raised', 4.5, 'DP body text'],
  ['dp-text-strong', 'dp-surface-page', 4.5, 'DP heading text'],
  ['dp-text-strong', 'dp-surface-raised', 4.5, 'DP heading text'],
  ['dp-text-on-chrome', 'dp-surface-chrome', 4.5, 'DP text on navy chrome'],
  ['dp-text-muted', 'dp-surface-page', 4.5, 'DP muted text'],
  ['dp-text-muted', 'dp-surface-raised', 4.5, 'DP muted text'],
  ['dp-text-muted-chrome', 'dp-surface-chrome', 4.5, 'DP muted on chrome (F3)'],
  ['sky-bright', 'dp-surface-chrome', 4.5, 'DP sky accent on chrome'],
  ['dp-action-ink', 'dp-surface-page', 4.5, 'DP link text'],
  ['dp-action-ink', 'dp-surface-raised', 4.5, 'DP link text'],
  ['dp-text-on-accent', 'dp-action-ink', 4.5, 'DP text on action fill'],
  ['dp-success-ink', 'dp-success-soft', 4.5, 'DP success chip text'],
  ['dp-warning-ink', 'dp-warning-soft', 4.5, 'DP warning chip text'],
  ['dp-danger-ink', 'dp-danger-soft', 4.5, 'DP danger chip text'],
  ['dp-live-ink', 'dp-live-soft', 4.5, 'DP live chip text'],
  ['dp-locked-ink', 'dp-locked-soft', 4.5, 'DP locked chip text'],
  ['dp-joker-ink', 'dp-joker-soft', 4.5, 'DP joker chip text'],
  ['dp-info-ink', 'dp-info-soft', 4.5, 'DP info chip text'],
  ['dp-success-ink', 'dp-surface-raised', 4.5, 'DP success text on card'],
  ['dp-warning-ink', 'dp-surface-raised', 4.5, 'DP warning text on card'],
  ['dp-danger-ink', 'dp-surface-raised', 4.5, 'DP danger text on card'],
  ['dp-live-ink', 'dp-surface-raised', 4.5, 'DP live text on card'],
  ['dp-locked-ink', 'dp-surface-raised', 4.5, 'DP locked text on card'],
  ['dp-joker-ink', 'dp-surface-raised', 4.5, 'DP joker text on card'],
  ['dp-info-ink', 'dp-surface-raised', 4.5, 'DP info text on card'],
  ['dp-border-strong', 'dp-surface-page', 3, 'DP control boundary'],
  ['dp-border-strong', 'dp-surface-raised', 3, 'DP control boundary'],
  ['dp-info-border', 'dp-surface-page', 3, 'DP info outline'],
  ['dp-info-border', 'dp-surface-raised', 3, 'DP info outline'],
  ['dp-action', 'dp-surface-page', 3, 'DP focus / active'],
  ['dp-action', 'dp-surface-raised', 3, 'DP focus / active'],
])

// Stage 14B closed every known contrast exception. Any future exception requires an approved Charter amendment.
export const TEMPORARY_CONTRAST_EXCEPTIONS = Object.freeze({})
