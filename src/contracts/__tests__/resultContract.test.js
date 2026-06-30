import { describe, expect, it } from 'vitest'
import {
  DECISION_METHOD,
  getScoreableResult,
  MATCH_STATUS,
  RESULT_STATUS,
  validateOfficialResult,
} from '../resultContract.js'

const teams = {
  home_team_id: 'team-home',
  away_team_id: 'team-away',
}

function complete(overrides = {}) {
  return {
    ...teams,
    match_status: MATCH_STATUS.COMPLETED,
    result_status: RESULT_STATUS.CONFIRMED,
    normal_time_home_goals: 2,
    normal_time_away_goals: 1,
    after_extra_time_home_goals: null,
    after_extra_time_away_goals: null,
    penalty_home_goals: null,
    penalty_away_goals: null,
    decision_method: DECISION_METHOD.NORMAL_TIME,
    winner_team_id: 'team-home',
    ...overrides,
  }
}

describe('official result representation', () => {
  it('accepts a completed group result decided in normal time', () => {
    expect(validateOfficialResult(complete(), { isKnockout: false })).toEqual({ valid: true, errors: [] })
  })

  it('accepts a drawn group result with no winner', () => {
    const result = complete({
      normal_time_home_goals: 1,
      normal_time_away_goals: 1,
      winner_team_id: null,
    })
    expect(validateOfficialResult(result, { isKnockout: false }).valid).toBe(true)
  })

  it('accepts a knockout result decided after extra time', () => {
    const result = complete({
      normal_time_home_goals: 1,
      normal_time_away_goals: 1,
      after_extra_time_home_goals: 2,
      after_extra_time_away_goals: 1,
      decision_method: DECISION_METHOD.EXTRA_TIME,
    })
    expect(validateOfficialResult(result, { isKnockout: true }).valid).toBe(true)
  })

  it('accepts a penalty decision while keeping shoot-out kicks separate', () => {
    const result = complete({
      normal_time_home_goals: 1,
      normal_time_away_goals: 1,
      after_extra_time_home_goals: 1,
      after_extra_time_away_goals: 1,
      penalty_home_goals: 4,
      penalty_away_goals: 3,
      decision_method: DECISION_METHOD.PENALTIES,
    })
    const assessed = getScoreableResult(result, { isKnockout: true })
    expect(assessed.scoreable).toBe(true)
    expect(assessed.result.normalTimeHomeGoals).toBe(1)
    expect(assessed.result.normalTimeAwayGoals).toBe(1)
    expect(assessed.result.advancingTeamId).toBe('team-home')
  })

  it('rejects extra time when normal time already has a winner', () => {
    const result = complete({
      after_extra_time_home_goals: 3,
      after_extra_time_away_goals: 1,
      decision_method: DECISION_METHOD.EXTRA_TIME,
    })
    expect(validateOfficialResult(result, { isKnockout: true }).errors)
      .toContain('extra time requires a draw at the end of normal time')
  })

  it('rejects a penalty shoot-out when the score after extra time is not level', () => {
    const result = complete({
      normal_time_home_goals: 1,
      normal_time_away_goals: 1,
      after_extra_time_home_goals: 2,
      after_extra_time_away_goals: 1,
      penalty_home_goals: 4,
      penalty_away_goals: 3,
      decision_method: DECISION_METHOD.PENALTIES,
    })
    expect(validateOfficialResult(result, { isKnockout: true }).errors)
      .toContain('a penalty shoot-out requires the score after extra time to be level')
  })

  it('does not score a suspended or postponed match', () => {
    expect(getScoreableResult(complete({ match_status: MATCH_STATUS.SUSPENDED }), { isKnockout: false }).scoreable).toBe(false)
    expect(getScoreableResult(complete({ match_status: MATCH_STATUS.POSTPONED }), { isKnockout: false }).scoreable).toBe(false)
  })

  it('does not score an unconfirmed result', () => {
    const assessed = getScoreableResult(complete({ result_status: RESULT_STATUS.PENDING }), { isKnockout: false })
    expect(assessed).toMatchObject({ scoreable: false, reason: 'result_not_confirmed' })
  })

  it('routes administrative decisions to manual review', () => {
    const assessed = getScoreableResult(complete({
      match_status: MATCH_STATUS.AWARDED,
      result_status: RESULT_STATUS.MANUAL_REVIEW,
      decision_method: DECISION_METHOD.ADMINISTRATIVE,
    }), { isKnockout: true })
    expect(assessed.scoreable).toBe(false)
  })
})
