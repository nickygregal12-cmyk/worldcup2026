export const GROUP_SCORING = Object.freeze({
  EXACT_SCORE: 5,
  CORRECT_RESULT: 3,
  JOKER_MULTIPLIER: 2,
})

export function calculateGroupPredictionPoints(prediction, result) {
  if (!prediction || !result) return 0
  const predictedOutcome = prediction.home_score > prediction.away_score
    ? 'H'
    : prediction.home_score < prediction.away_score ? 'A' : 'D'
  const actualOutcome = result.home_score > result.away_score
    ? 'H'
    : result.home_score < result.away_score ? 'A' : 'D'

  if (predictedOutcome !== actualOutcome) return 0
  const exact = prediction.home_score === result.home_score && prediction.away_score === result.away_score
  const base = exact ? GROUP_SCORING.EXACT_SCORE : GROUP_SCORING.CORRECT_RESULT
  return base * (prediction.is_confident ? GROUP_SCORING.JOKER_MULTIPLIER : 1)
}
