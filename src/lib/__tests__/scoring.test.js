import { describe, expect, it } from 'vitest'
import { calculateGroupPredictionPoints, GROUP_SCORING } from '../scoring.js'

describe('calculateGroupPredictionPoints', () => {
  it('returns zero when prediction or result is missing', () => {
    expect(calculateGroupPredictionPoints(null, { home_score: 1, away_score: 0 })).toBe(0)
    expect(calculateGroupPredictionPoints({ home_score: 1, away_score: 0 }, null)).toBe(0)
  })

  it('awards exact-score points', () => {
    const prediction = { home_score: 2, away_score: 1, is_confident: false }
    expect(calculateGroupPredictionPoints(prediction, { home_score: 2, away_score: 1 }))
      .toBe(GROUP_SCORING.EXACT_SCORE)
  })

  it('awards correct-result points when the score is not exact', () => {
    const prediction = { home_score: 2, away_score: 0, is_confident: false }
    expect(calculateGroupPredictionPoints(prediction, { home_score: 3, away_score: 1 }))
      .toBe(GROUP_SCORING.CORRECT_RESULT)
  })

  it('handles draws as a correct result', () => {
    const prediction = { home_score: 1, away_score: 1, is_confident: false }
    expect(calculateGroupPredictionPoints(prediction, { home_score: 2, away_score: 2 }))
      .toBe(GROUP_SCORING.CORRECT_RESULT)
  })

  it('doubles an exact score when the joker is active', () => {
    const prediction = { home_score: 1, away_score: 0, is_confident: true }
    expect(calculateGroupPredictionPoints(prediction, { home_score: 1, away_score: 0 }))
      .toBe(GROUP_SCORING.EXACT_SCORE * GROUP_SCORING.JOKER_MULTIPLIER)
  })

  it('awards zero for the wrong outcome', () => {
    const prediction = { home_score: 2, away_score: 0, is_confident: true }
    expect(calculateGroupPredictionPoints(prediction, { home_score: 0, away_score: 1 })).toBe(0)
  })
})
