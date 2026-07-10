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
// match-card.css arrived with the Home v2 rebuild as shared MatchCard styling; it is frozen here and
// should be folded into a CSS Module in a dedicated slice rather than grown further.
export const GLOBAL_STYLESHEET_CAPS = Object.freeze({
  // Raised 204 -> 301 at Stage DP-0 for the full Design Programme palette (light
  // + F1 ink variants + gap tokens + transcribed dark palette). Owner-approved
  // §5.8 ratchet exception, recorded in AGENT-CONTROL/09-STAGE-ORDER.md (DP-0).
  'src/design/tokens.css': 301,
  'src/design/typography.css': 12,
  'src/styles/feature-compat.css': 2590,
  'src/styles/app.css': 1903,
  'src/styles/groups-predictor.css': 555,
  'src/styles/knockout-experiences.css': 463,
  'src/styles/match-card.css': 186,
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
