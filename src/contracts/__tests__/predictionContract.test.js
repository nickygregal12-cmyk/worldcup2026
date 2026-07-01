import { describe, expect, it } from 'vitest'
import {
  BRACKET_REACH_POINTS,
  calculateBracketReachPoints,
  calculateMatchPredictionPoints,
  EURO_PREDICTION_CONTRACT_VERSION,
  getScoreOutcome,
  JOKER_RULES,
  KNOCKOUT_MATCH_POINTS,
  MATCH_SCORE_POINTS,
  validateGroupPrediction,
  validateKnockoutPrediction,
} from '../predictionContract.js'
import { DECISION_METHOD } from '../resultContract.js'

const participants = { homeTeamId: 'home', awayTeamId: 'away' }

describe('Euro prediction contract', () => {
  it('has an explicit version', () => {
    expect(EURO_PREDICTION_CONTRACT_VERSION).toBe('euro28-v2')
  })

  it('accepts non-negative integer group scores only after participants resolve', () => {
    expect(validateGroupPrediction({ home_score: 2, away_score: 1 }).valid).toBe(true)
    expect(validateGroupPrediction({ home_score: 2, away_score: 1 }, { participantsResolved: false }).valid).toBe(false)
    expect(validateGroupPrediction({ home_score: -1, away_score: 1 }).valid).toBe(false)
  })

  it('requires a normal-time knockout pick to agree with its score', () => {
    const valid = validateKnockoutPrediction({
      home_score: 2,
      away_score: 1,
      advancing_team_id: 'home',
      decision_method: DECISION_METHOD.NORMAL_TIME,
    }, participants)
    expect(valid.valid).toBe(true)

    const invalid = validateKnockoutPrediction({
      home_score: 2,
      away_score: 1,
      advancing_team_id: 'away',
      decision_method: DECISION_METHOD.NORMAL_TIME,
    }, participants)
    expect(invalid.valid).toBe(false)
  })

  it('requires a normal-time draw when predicting extra time or penalties', () => {
    expect(validateKnockoutPrediction({
      home_score: 1,
      away_score: 1,
      advancing_team_id: 'away',
      decision_method: DECISION_METHOD.PENALTIES,
    }, participants).valid).toBe(true)

    expect(validateKnockoutPrediction({
      home_score: 2,
      away_score: 1,
      advancing_team_id: 'home',
      decision_method: DECISION_METHOD.EXTRA_TIME,
    }, participants).valid).toBe(false)
  })

  it('identifies home, away and draw outcomes', () => {
    expect(getScoreOutcome(2, 1)).toBe('home')
    expect(getScoreOutcome(0, 1)).toBe('away')
    expect(getScoreOutcome(1, 1)).toBe('draw')
  })
})

describe('uniform match scoring', () => {
  it('awards the configured exact-score value without stacking outcome points', () => {
    const points = calculateMatchPredictionPoints(
      { home_score: 2, away_score: 1 },
      { normalTimeHomeGoals: 2, normalTimeAwayGoals: 1 },
    )
    expect(points).toMatchObject({
      exactScore: MATCH_SCORE_POINTS.EXACT_SCORE,
      correctOutcome: 0,
      total: MATCH_SCORE_POINTS.EXACT_SCORE,
    })
  })

  it('awards the configured correct-outcome value', () => {
    const points = calculateMatchPredictionPoints(
      { home_score: 1, away_score: 0 },
      { normalTimeHomeGoals: 3, normalTimeAwayGoals: 1 },
    )
    expect(points.total).toBe(MATCH_SCORE_POINTS.CORRECT_OUTCOME)
  })

  it('scores a knockout normal-time draw independently from the eventual winner', () => {
    const points = calculateMatchPredictionPoints({
      home_score: 1,
      away_score: 1,
      advancing_team_id: 'away',
      decision_method: DECISION_METHOD.PENALTIES,
    }, {
      normalTimeHomeGoals: 1,
      normalTimeAwayGoals: 1,
      advancingTeamId: 'away',
      decisionMethod: DECISION_METHOD.PENALTIES,
    }, { isKnockout: true })

    expect(points).toMatchObject({
      exactScore: MATCH_SCORE_POINTS.EXACT_SCORE,
      correctOutcome: 0,
      correctAdvancingTeam: KNOCKOUT_MATCH_POINTS.CORRECT_ADVANCING_TEAM,
      correctDecisionMethod: KNOCKOUT_MATCH_POINTS.CORRECT_DECISION_METHOD,
      jokerApplied: false,
      jokerMultiplier: 1,
      total: MATCH_SCORE_POINTS.EXACT_SCORE +
        KNOCKOUT_MATCH_POINTS.CORRECT_ADVANCING_TEAM +
        KNOCKOUT_MATCH_POINTS.CORRECT_DECISION_METHOD,
    })
  })

  it('does not award a method bonus when the advancing team is wrong', () => {
    const points = calculateMatchPredictionPoints({
      home_score: 1,
      away_score: 1,
      advancing_team_id: 'home',
      decision_method: DECISION_METHOD.PENALTIES,
    }, {
      normalTimeHomeGoals: 1,
      normalTimeAwayGoals: 1,
      advancingTeamId: 'away',
      decisionMethod: DECISION_METHOD.PENALTIES,
    }, { isKnockout: true })

    expect(points.correctDecisionMethod).toBe(0)
    expect(points.total).toBe(MATCH_SCORE_POINTS.EXACT_SCORE)
  })

  it('applies the centrally configured joker multiplier', () => {
    const ordinary = calculateMatchPredictionPoints(
      { home_score: 2, away_score: 0 },
      { normalTimeHomeGoals: 2, normalTimeAwayGoals: 0 },
    )
    const joker = calculateMatchPredictionPoints(
      { home_score: 2, away_score: 0 },
      { normalTimeHomeGoals: 2, normalTimeAwayGoals: 0 },
      { jokerApplied: true },
    )
    expect(joker.jokerApplied).toBe(true)
    expect(joker.jokerMultiplier).toBe(JOKER_RULES.MULTIPLIER)
    expect(joker.total).toBe(ordinary.total * JOKER_RULES.MULTIPLIER)
  })

  it('does not treat the legacy confidence field as a joker', () => {
    const ordinary = calculateMatchPredictionPoints(
      { home_score: 2, away_score: 0 },
      { normalTimeHomeGoals: 2, normalTimeAwayGoals: 0 },
    )
    const legacyShaped = calculateMatchPredictionPoints(
      { home_score: 2, away_score: 0, is_confident: true },
      { normalTimeHomeGoals: 2, normalTimeAwayGoals: 0 },
    )
    expect(legacyShaped.total).toBe(ordinary.total)
    expect(legacyShaped.jokerApplied).toBe(false)
  })
})

describe('bracket milestone scoring', () => {
  it('scores teams by reaching a round rather than exact match path', () => {
    const points = calculateBracketReachPoints({
      round_of_16: ['A', 'B', 'C'],
      quarter_final: ['A', 'B'],
      semi_final: ['A'],
      final: ['A'],
      champion: ['A'],
    }, {
      round_of_16: ['A', 'B', 'D'],
      quarter_final: ['A', 'C'],
      semi_final: ['A'],
      final: ['A'],
      champion: ['A'],
    })

    expect(points.byMilestone.round_of_16.correctTeamIds).toEqual(['A', 'B'])
    expect(points.byMilestone.quarter_final.correctTeamIds).toEqual(['A'])
    expect(points.total).toBe(
      (2 * BRACKET_REACH_POINTS.round_of_16) +
      BRACKET_REACH_POINTS.quarter_final +
      BRACKET_REACH_POINTS.semi_final +
      BRACKET_REACH_POINTS.final +
      BRACKET_REACH_POINTS.champion,
    )
  })

  it('counts a team only once per milestone', () => {
    const points = calculateBracketReachPoints(
      { quarter_final: ['A', 'A', 'A'] },
      { quarter_final: ['A'] },
    )
    expect(points.byMilestone.quarter_final.points).toBe(BRACKET_REACH_POINTS.quarter_final)
  })
})
