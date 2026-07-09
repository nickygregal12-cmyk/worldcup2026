// PARKED FOR STAGE 17A — no runtime consumers yet, deliberately kept and tested.
// Carries the scoring-only tournament-pick rules (goals total, etc.) gated
// behind Stage 17A per the Decision Register. Its test keeps the record honest
// until 17A wires it into the product; do not delete as dead code.
export const TOURNAMENT_PICK_CONTRACT_VERSION = 'euro28-tournament-picks-v1'

export const TOURNAMENT_PICK_KEYS = Object.freeze({
  TOTAL_GOALS: 'total_goals',
  TOP_SCORER: 'top_scorer',
  HIGHEST_SCORING_TEAM: 'highest_scoring_team',
})

export const TOURNAMENT_PICK_POINTS = Object.freeze({
  [TOURNAMENT_PICK_KEYS.TOTAL_GOALS]: 20,
  [TOURNAMENT_PICK_KEYS.TOP_SCORER]: 20,
  [TOURNAMENT_PICK_KEYS.HIGHEST_SCORING_TEAM]: 20,
})

export const TOURNAMENT_PICK_RULES = Object.freeze({
  competition: 'original',
  lock: 'global_tournament_lock',
  jokerAllowed: false,
  standaloneAwardsRoute: false,
  playerSelectorActivationStage: '17A',
})

export function scoreTotalGoalsPick(predictedTotal, actualTotal, nearestDistance) {
  if (![predictedTotal, actualTotal, nearestDistance].every(Number.isInteger)) return 0
  if (predictedTotal < 0 || actualTotal < 0 || nearestDistance < 0) return 0
  return Math.abs(predictedTotal - actualTotal) === nearestDistance
    ? TOURNAMENT_PICK_POINTS[TOURNAMENT_PICK_KEYS.TOTAL_GOALS]
    : 0
}

export function scoreWinnerSetPick(pickedId, officialWinnerIds, pickKey) {
  if (typeof pickedId !== 'string' || pickedId.trim() === '') return 0
  if (!Array.isArray(officialWinnerIds)) return 0
  if (![TOURNAMENT_PICK_KEYS.TOP_SCORER, TOURNAMENT_PICK_KEYS.HIGHEST_SCORING_TEAM].includes(pickKey)) return 0
  return officialWinnerIds.includes(pickedId)
    ? TOURNAMENT_PICK_POINTS[pickKey]
    : 0
}
