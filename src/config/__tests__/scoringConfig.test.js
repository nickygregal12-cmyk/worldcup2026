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

  it('is explicitly provisional rather than permanently approved', () => {
    expect(EURO_SCORING_CONFIG.status).toBe(SCORING_CONFIG_STATUS.PROVISIONAL)
    expect(EURO_SCORING_CONFIG.version).toContain('provisional')
  })

  it('includes jokers while leaving exact caps visibly unresolved', () => {
    expect(EURO_SCORING_CONFIG.joker.ENABLED).toBe(true)
    expect(EURO_SCORING_CONFIG.joker.MULTIPLIER).toBeGreaterThan(0)
    expect(EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP).toBeNull()
    expect(EURO_SCORING_CONFIG.joker.KNOCKOUT_CAP).toBeNull()
  })

  it('rejects invalid point and joker values', () => {
    const invalidPoints = {
      ...EURO_SCORING_CONFIG,
      match: { ...EURO_SCORING_CONFIG.match, EXACT_SCORE: -1 },
    }
    expect(validateScoringConfig(invalidPoints).valid).toBe(false)

    const invalidJoker = {
      ...EURO_SCORING_CONFIG,
      joker: { ...EURO_SCORING_CONFIG.joker, MULTIPLIER: 0 },
    }
    expect(validateScoringConfig(invalidJoker).valid).toBe(false)
  })
})
