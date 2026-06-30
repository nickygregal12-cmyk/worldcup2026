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

  it('rejects invalid point values', () => {
    const invalid = {
      ...EURO_SCORING_CONFIG,
      match: { ...EURO_SCORING_CONFIG.match, EXACT_SCORE: -1 },
    }
    expect(validateScoringConfig(invalid).valid).toBe(false)
  })
})
