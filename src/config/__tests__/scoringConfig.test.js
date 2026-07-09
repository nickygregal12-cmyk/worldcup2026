import { describe, expect, it } from 'vitest'
import {
  EURO_SCORING_CONFIG,
  SCORING_CONFIG_STATUS,
  SCORING_SOURCE,
  mapScoringRulesetRow,
  resolveActiveScoring,
  validateScoringConfig,
} from '../scoringConfig.js'

// Shape of the canonical row seeded by migration 0005 and corrected by 0010.
const CANONICAL_RULESET_ROW = {
  id: 'ruleset-1',
  ruleset_key: 'euro28-scoring-provisional-v2',
  status: 'provisional',
  match_exact_score_points: 30,
  match_correct_outcome_points: 10,
  knockout_advancing_team_points: 10,
  knockout_decision_method_points: 5,
  round_of_16_team_points: 10,
  quarter_final_team_points: 15,
  semi_final_team_points: 20,
  finalist_points: 25,
  champion_points: 50,
  joker_multiplier: '2.000',
  group_stage_joker_cap: 5,
  knockout_joker_cap: 5,
}

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

  it('keeps KO Predictor match points separate from bracket points', () => {
    expect(EURO_SCORING_CONFIG.koPredictor.CORRECT_ADVANCING_TEAM).toBe(10)
    expect(EURO_SCORING_CONFIG.bracket.champion).toBe(50)
  })

  it('maps the database ruleset row into the client scoring shape', () => {
    const mapped = mapScoringRulesetRow(CANONICAL_RULESET_ROW)
    expect(mapped.match.EXACT_SCORE).toBe(30)
    expect(mapped.bracket.final).toBe(25)
    expect(mapped.joker.MULTIPLIER).toBe(2)
    expect(mapped.joker.GROUP_STAGE_CAP).toBe(5)
    expect(mapped.joker.ORIGINAL_BRACKET_CAP).toBe(0)
    expect(validateScoringConfig(mapped)).toEqual({ valid: true, errors: [] })
  })

  it('resolves database scoring as the displayed source when a ruleset row loads', () => {
    const scoring = resolveActiveScoring({ ...CANONICAL_RULESET_ROW, match_exact_score_points: 40 })
    expect(scoring.source).toBe(SCORING_SOURCE.DATABASE)
    expect(scoring.provisional).toBe(false)
    // Displayed values follow the database, not the hardcoded config, even when they differ.
    expect(scoring.values.match.EXACT_SCORE).toBe(40)
    expect(scoring.rulesetKey).toBe('euro28-scoring-provisional-v2')
  })

  it('resolves the central config only as a labelled provisional fallback', () => {
    const scoring = resolveActiveScoring(null)
    expect(scoring.source).toBe(SCORING_SOURCE.CENTRAL_PROVISIONAL)
    expect(scoring.provisional).toBe(true)
    expect(scoring.values).toBe(EURO_SCORING_CONFIG)
  })

  it('surfaces contract violations from the database row instead of hiding them', () => {
    // NULL caps mirror the state migration 0008 restored — SQL fails closed on them.
    const scoring = resolveActiveScoring({ ...CANONICAL_RULESET_ROW, group_stage_joker_cap: null })
    expect(scoring.valid).toBe(false)
    expect(scoring.errors.length).toBeGreaterThan(0)
    expect(scoring.values.joker.GROUP_STAGE_CAP).toBeNull()
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
