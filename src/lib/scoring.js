import {
  calculateMatchPredictionPoints,
  MATCH_SCORE_POINTS,
} from '../contracts/predictionContract.js'

/**
 * Compatibility export for the quarantined WC26 modules.
 * Euro 2028 has no joker/confidence multiplier.
 */
export const GROUP_SCORING = Object.freeze({
  EXACT_SCORE: MATCH_SCORE_POINTS.EXACT_SCORE,
  CORRECT_RESULT: MATCH_SCORE_POINTS.CORRECT_OUTCOME,
})

export function calculateGroupPredictionPoints(prediction, result) {
  if (!prediction || !result) return 0
  return calculateMatchPredictionPoints(
    {
      home_score: prediction.home_score,
      away_score: prediction.away_score,
    },
    {
      normalTimeHomeGoals: result.home_score,
      normalTimeAwayGoals: result.away_score,
    },
  ).total
}
