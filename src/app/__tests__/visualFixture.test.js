import { describe, expect, it } from 'vitest'
import { EURO_SCORING_CONFIG } from '../../config/scoringConfig.js'
import { VISUAL_HOME_DASHBOARD } from '../visualFixture.js'

describe('Stage 13A visual fixture', () => {
  it('uses the central joker caps rather than duplicating configurable values', () => {
    expect(VISUAL_HOME_DASHBOARD.original.jokerCap).toBe(EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP)
    expect(VISUAL_HOME_DASHBOARD.koPredictor.jokerCap).toBe(EURO_SCORING_CONFIG.joker.KO_PREDICTOR_CAP)
  })
})
