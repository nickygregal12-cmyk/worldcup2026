export const FRONTEND_COMPONENT_HARD_CAP = 400
export const FRONTEND_STYLESHEET_HARD_CAP = 400

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

// Permanent global CSS is limited to tokens and typography. The four compatibility files are frozen debt.
export const GLOBAL_STYLESHEET_CAPS = Object.freeze({
  'src/design/tokens.css': 204,
  'src/design/typography.css': 12,
  'src/styles/feature-compat.css': 2590,
  'src/styles/app.css': 1906,
  'src/styles/groups-predictor.css': 605,
  'src/styles/knockout-experiences.css': 463,
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
])

// Stage 14B closed every known contrast exception. Any future exception requires an approved Charter amendment.
export const TEMPORARY_CONTRAST_EXCEPTIONS = Object.freeze({})
