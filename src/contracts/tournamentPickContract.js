export const TOURNAMENT_PICK_CONTRACT_VERSION = 'euro28-tournament-picks-v1'

export const TOURNAMENT_PICK_KEYS = Object.freeze({
  TOTAL_GOALS: 'total_goals',
  TOP_SCORER: 'top_scorer',
})

/**
 * Group-goals total is auto-calculated (never a flat pick): tiered by the
 * absolute distance between the user's predicted 36-match group-goal total and
 * the actual total. Bands are inclusive by distance (exactly 5 off -> 15,
 * exactly 10 off -> 5). CLAUDE.md §4 / docs/RULES-SCORING-LOCKED-CONTRACT.md.
 */
export const GROUP_GOALS_TIERS = Object.freeze({
  EXACT: 25,
  WITHIN_5: 15,
  WITHIN_10: 5,
})

export const TOURNAMENT_PICK_POINTS = Object.freeze({
  [TOURNAMENT_PICK_KEYS.TOP_SCORER]: 30,
})

export const TOURNAMENT_PICK_RULES = Object.freeze({
  competition: 'original',
  lock: 'global_tournament_lock',
  jokerAllowed: false,
  standaloneAwardsRoute: false,
  playerSelectorActivationStage: '17A',
})

/**
 * Tiered group-goals score: 25 exact, 15 within 5, 5 within 10, else 0.
 */
export function scoreTotalGoalsPick(predictedTotal, actualTotal) {
  if (![predictedTotal, actualTotal].every(Number.isInteger)) return 0
  if (predictedTotal < 0 || actualTotal < 0) return 0
  const distance = Math.abs(predictedTotal - actualTotal)
  if (distance === 0) return GROUP_GOALS_TIERS.EXACT
  if (distance <= 5) return GROUP_GOALS_TIERS.WITHIN_5
  if (distance <= 10) return GROUP_GOALS_TIERS.WITHIN_10
  return 0
}

/**
 * Top Scorer pays full points to any picker of a tied winner: joint winners are
 * all present in officialWinnerIds, so every correct picker collects the full 30.
 */
export function scoreWinnerSetPick(pickedId, officialWinnerIds, pickKey = TOURNAMENT_PICK_KEYS.TOP_SCORER) {
  if (typeof pickedId !== 'string' || pickedId.trim() === '') return 0
  if (!Array.isArray(officialWinnerIds)) return 0
  if (pickKey !== TOURNAMENT_PICK_KEYS.TOP_SCORER) return 0
  return officialWinnerIds.includes(pickedId)
    ? TOURNAMENT_PICK_POINTS[TOURNAMENT_PICK_KEYS.TOP_SCORER]
    : 0
}
