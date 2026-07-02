import { describe, expect, it } from 'vitest'
import { EURO_SCORING_CONFIG } from '../../config/scoringConfig.js'
import { validateGuestPredictionState } from '../../guest/index.js'
import { VISUAL_GROUP_DRAFT, VISUAL_GROUP_REFERENCE, VISUAL_HOME_DASHBOARD } from '../visualFixture.js'

describe('Stage 13 visual fixtures', () => {
  it('uses the central joker caps rather than duplicating configurable values', () => {
    expect(VISUAL_HOME_DASHBOARD.original.jokerCap).toBe(EURO_SCORING_CONFIG.joker.GROUP_STAGE_CAP)
    expect(VISUAL_HOME_DASHBOARD.koPredictor.jokerCap).toBe(EURO_SCORING_CONFIG.joker.KO_PREDICTOR_CAP)
  })

  it('provides a valid provisional 36-match Groups workspace', () => {
    expect(VISUAL_GROUP_REFERENCE.groupMatches).toHaveLength(36)
    expect(VISUAL_GROUP_REFERENCE.groups.flatMap(group => group.teams)).toHaveLength(24)
    expect(VISUAL_GROUP_REFERENCE.teamsById['visual-team-1']).toMatchObject({ isoCode: 'SCO', isProvisional: true })
    expect(validateGuestPredictionState(VISUAL_GROUP_DRAFT, VISUAL_GROUP_REFERENCE)).toEqual({ valid: true, errors: [] })
  })
})
