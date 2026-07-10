import { describe, expect, it } from 'vitest'
import {
  EURO_SCORING_CONFIG,
  SCORING_CONFIG_STATUS,
  validateScoringConfig,
} from '../scoringConfig.js'

describe('Euro scoring configuration', () => {
  it('is a valid single scoring configuration', () => {
    expect(validateScoringConfig(EURO_SCORING_CONFIG)).toEqual({ valid: true, errors: [] })
  })

  it('remains provisional while using confirmed joker caps', () => {
    expect(EURO_SCORING_CONFIG.status).toBe(SCORING_CONFIG_STATUS.PROVISIONAL)
    expect(EURO_SCORING_CONFIG.version).toContain('provisional')
    expect(EURO_SCORING_CONFIG.joker.MULTIPLIER).toBe(2)
  })

  it('keeps original and KO Predictor joker scopes separate', () => {
    expect(EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP).toBe(5)
    expect(EURO_SCORING_CONFIG.joker.ORIGINAL_BRACKET_CAP).toBe(0)
    expect(EURO_SCORING_CONFIG.joker.KO_PREDICTOR_CAP).toBe(5)
  })

  it('uses the locked group match and group-position values', () => {
    expect(EURO_SCORING_CONFIG.match.EXACT_SCORE).toBe(5)
    expect(EURO_SCORING_CONFIG.match.CORRECT_OUTCOME).toBe(3)
    expect(EURO_SCORING_CONFIG.groupPositions.PER_CORRECT_POSITION).toBe(2)
    expect(EURO_SCORING_CONFIG.groupPositions.PERFECT_GROUP_BONUS).toBe(5)
  })

  it('uses the locked KO Predictor three-component match scheme', () => {
    expect(EURO_SCORING_CONFIG.koPredictor.CORRECT_ADVANCER).toBe(5)
    expect(EURO_SCORING_CONFIG.koPredictor.CORRECT_DRAW_CALL).toBe(5)
    expect(EURO_SCORING_CONFIG.koPredictor.EXACT_90_SCORE).toBe(5)
  })

  it('keeps the cumulative bracket ladder separate from KO Predictor points', () => {
    expect(EURO_SCORING_CONFIG.bracket.round_of_16).toBe(8)
    expect(EURO_SCORING_CONFIG.bracket.quarter_final).toBe(12)
    expect(EURO_SCORING_CONFIG.bracket.semi_final).toBe(15)
    expect(EURO_SCORING_CONFIG.bracket.final).toBe(20)
    expect(EURO_SCORING_CONFIG.bracket.champion).toBe(45)
  })

  it('rejects invalid point and joker values', () => {
    const invalidPoints = {
      ...EURO_SCORING_CONFIG,
      match: { ...EURO_SCORING_CONFIG.match, EXACT_SCORE: -1 },
    }
    expect(validateScoringConfig(invalidPoints).valid).toBe(false)

    const invalidJoker = {
      ...EURO_SCORING_CONFIG,
      joker: { ...EURO_SCORING_CONFIG.joker, KO_PREDICTOR_CAP: 4 },
    }
    expect(validateScoringConfig(invalidJoker).valid).toBe(false)
  })
})
