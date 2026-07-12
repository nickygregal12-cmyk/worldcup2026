// Score-entry rules shared by ScoreInput and its tests. They live outside the
// component file because it may only export components (react-refresh), and
// because keeping the decisions pure lets every case be enumerated directly.
// Since the jsdom stage they are also exercised through real taps and typing —
// see PredictionInputRow.interaction.test.jsx, which proves the component obeys
// the rules below rather than merely that the rules are right.

// High-score confirm, item 63: a typed value at or above this asks once.
export const HIGH_SCORE_THRESHOLD = 7

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function parseScore(value, min, max) {
  if (value === '') return null
  const numeric = Number(value)
  return Number.isInteger(numeric) ? clamp(numeric, min, max) : null
}

// A stepper tap moves by one and never below the floor (owner ruling: adjust
// by 1, floor 0). An empty score steps up from zero.
export function stepScore(value, delta, min, max) {
  return clamp((value ?? 0) + delta, min, max)
}

// Pure decision for the confirm: a TYPED value at/above the threshold that has
// not already been confirmed. Steppers never call this — deliberate tapping
// means you meant it (owner ruling), so only typed entry can trigger the ask.
export function needsHighScoreConfirm(value, confirmedValues, threshold = HIGH_SCORE_THRESHOLD) {
  if (!Number.isInteger(value) || value < threshold) return false
  return !confirmedValues.has(value)
}

// A value the user reached deliberately counts as confirmed from then on, so a
// later typed entry of the same number never re-asks (item 63: shown once).
export function rememberConfirmed(confirmedValues, value) {
  if (!Number.isInteger(value) || value < HIGH_SCORE_THRESHOLD) return confirmedValues
  return new Set(confirmedValues).add(value)
}
