import { describe, expect, it } from 'vitest'
import {
  LEAGUE_COMPETITION,
  compareSharedPredictionBundles,
  normaliseLeague,
  normaliseStanding,
  validateJoinCode,
  validateLeagueName,
} from '../leagueModel.js'

describe('league model', () => {
  it('normalises and validates league names', () => {
    expect(validateLeagueName('  Glasgow   Crew  ')).toEqual({
      valid: true,
      value: 'Glasgow Crew',
      error: null,
    })
    expect(validateLeagueName('x').valid).toBe(false)
  })

  it('normalises join codes', () => {
    expect(validateJoinCode('ab12-cd34-ef')).toEqual({
      valid: true,
      value: 'AB12CD34EF',
      error: null,
    })
    expect(validateJoinCode('ABC').valid).toBe(false)
  })

  it('normalises league and standings rows', () => {
    expect(normaliseLeague({
      league_id: 'league-1',
      league_name: 'Family',
      join_code: 'ABCDEF1234',
      member_role: 'owner',
      member_count: '4',
      created_at: '2026-01-01',
    })).toMatchObject({ id: 'league-1', memberCount: 4, memberRole: 'owner' })

    expect(normaliseStanding({
      rank: '2',
      user_id: 'user-2',
      display_name: 'Nicky',
      member_role: 'member',
      match_points: '20',
      bracket_points: '10',
      total_points: '30',
      scored_match_count: '3',
      is_current_user: true,
    })).toMatchObject({ rank: 2, totalPoints: 30, isCurrentUser: true })
  })

  it('does not compare hidden bundles', () => {
    const result = compareSharedPredictionBundles(
      { visible: false, reason: 'Locked' },
      { visible: true },
      LEAGUE_COMPETITION.ORIGINAL,
    )
    expect(result.visible).toBe(false)
    expect(result.reason).toBe('Locked')
  })

  it('compares original scores and bracket winners', () => {
    const left = {
      visible: true,
      match_predictions: [
        { match_number: 1, home_score_90: 2, away_score_90: 1, joker_applied: true },
        { match_number: 2, home_score_90: 0, away_score_90: 0 },
      ],
      bracket_predictions: [
        { match_number: 37, advancing_tournament_team_id: 'A' },
        { match_number: 38, advancing_tournament_team_id: 'B' },
      ],
    }
    const right = {
      visible: true,
      match_predictions: [
        { match_number: 1, home_score_90: 2, away_score_90: 1 },
        { match_number: 2, home_score_90: 1, away_score_90: 1 },
      ],
      bracket_predictions: [
        { match_number: 37, advancing_tournament_team_id: 'A' },
        { match_number: 38, advancing_tournament_team_id: 'C' },
      ],
    }

    const result = compareSharedPredictionBundles(left, right, LEAGUE_COMPETITION.ORIGINAL)
    expect(result.visible).toBe(true)
    expect(result.comparedMatches).toBe(2)
    expect(result.exactScoreMatches).toBe(1)
    expect(result.bracketMatches).toBe(1)
    expect(result.rows[0].leftJoker).toBe(true)
  })

  it('compares KO advancing teams and methods separately', () => {
    const left = {
      visible: true,
      match_predictions: [{
        match_number: 37,
        home_score_90: 1,
        away_score_90: 1,
        advancing_tournament_team_id: 'A',
        decision_method: 'penalties',
      }],
    }
    const right = {
      visible: true,
      match_predictions: [{
        match_number: 37,
        home_score_90: 1,
        away_score_90: 1,
        advancing_tournament_team_id: 'A',
        decision_method: 'extra_time',
      }],
    }

    const result = compareSharedPredictionBundles(left, right, LEAGUE_COMPETITION.KO_PREDICTOR)
    expect(result.exactScoreMatches).toBe(1)
    expect(result.advancingTeamMatches).toBe(1)
    expect(result.methodMatches).toBe(0)
    expect(result.bracketMatches).toBe(0)
  })
})
