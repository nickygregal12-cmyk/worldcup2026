import { describe, expect, it } from 'vitest'
import { calculateGroupPredictionPoints, GROUP_SCORING } from '../scoring.js'

describe('Euro group scoring compatibility helper', () => {
  it('returns zero when prediction or result is missing', () => {
    expect(calculateGroupPredictionPoints(null, { home_score: 1, away_score: 0 })).toBe(0)
    expect(calculateGroupPredictionPoints({ home_score: 1, away_score: 0 }, null)).toBe(0)
  })

  it('awards the Euro exact-score value', () => {
    expect(calculateGroupPredictionPoints(
      { home_score: 2, away_score: 1 },
      { home_score: 2, away_score: 1 },
    )).toBe(GROUP_SCORING.EXACT_SCORE)
  })

  it('awards the Euro correct-outcome value', () => {
    expect(calculateGroupPredictionPoints(
      { home_score: 2, away_score: 0 },
      { home_score: 3, away_score: 1 },
    )).toBe(GROUP_SCORING.CORRECT_RESULT)
  })

  it('does not apply the inherited confidence multiplier', () => {
    expect(calculateGroupPredictionPoints(
      { home_score: 1, away_score: 0, is_confident: true },
      { home_score: 1, away_score: 0 },
    )).toBe(GROUP_SCORING.EXACT_SCORE)
  })

  it('awards zero for the wrong outcome', () => {
    expect(calculateGroupPredictionPoints(
      { home_score: 2, away_score: 0 },
      { home_score: 0, away_score: 1 },
    )).toBe(0)
  })
})
