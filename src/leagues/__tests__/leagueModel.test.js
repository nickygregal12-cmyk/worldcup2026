import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import {
  buildLeagueCompetitionSummary,
  buildSharedLeagueMemberList,
  buildSharedPredictionJourney,
  LEAGUE_COMPETITION,
  compareSharedPredictionBundles,
  formatOrdinal,
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

  it('formats league ranks with correct British ordinal suffixes', () => {
    expect(formatOrdinal(1)).toBe('1st')
    expect(formatOrdinal(2)).toBe('2nd')
    expect(formatOrdinal(3)).toBe('3rd')
    expect(formatOrdinal(11)).toBe('11th')
    expect(formatOrdinal(21)).toBe('21st')
    expect(formatOrdinal(null)).toBe('—')
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

  it('builds separate current-user summaries without combining competitions', () => {
    const original = [normaliseStanding({
      rank: 2, user_id: 'me', display_name: 'Nicky', match_points: 20,
      bracket_points: 10, total_points: 30, scored_match_count: 3, is_current_user: true,
    })]
    const summary = buildLeagueCompetitionSummary(original, LEAGUE_COMPETITION.ORIGINAL)
    expect(summary).toMatchObject({ currentRank: 2, currentPoints: 30, state: 'active' })
    expect(() => buildLeagueCompetitionSummary([], 'combined')).toThrow('Unsupported league competition')
  })

  it('creates one shared member list from either competition table', () => {
    const members = buildSharedLeagueMemberList([
      { userId: 'b', displayName: 'Zara', memberRole: 'member', isCurrentUser: false },
      { userId: 'a', displayName: 'Nicky', memberRole: 'owner', isCurrentUser: true },
    ], [
      { userId: 'a', displayName: 'Nicky', memberRole: 'owner', isCurrentUser: true },
      { userId: 'c', displayName: 'Amy', memberRole: 'member', isCurrentUser: false },
    ])
    expect(members.map(row => row.userId)).toEqual(['c', 'a', 'b'])
    expect(members).toHaveLength(3)
  })

  it('builds locked Original rows without exposing hidden picks', () => {
    const journey = buildSharedPredictionJourney({
      bundle: { visible: false, reason: 'Locked', match_predictions: [], bracket_predictions: [] },
      reference: buildGuestReference(),
      competitionKey: LEAGUE_COMPETITION.ORIGINAL,
    })
    expect(journey.matches).toHaveLength(36)
    expect(journey.bracket).toHaveLength(15)
    expect(journey.matches.every(row => row.visibility === 'private')).toBe(true)
    expect(journey.matches[0].score).toBeNull()
  })

  it('shows only returned KO picks and keeps future fixtures private', () => {
    const reference = buildGuestReference()
    reference.knockoutMatches[0].status = 'completed'
    const journey = buildSharedPredictionJourney({
      bundle: {
        visible: true,
        display_name: 'Member',
        match_predictions: [{
          match_id: reference.knockoutMatches[0].matchId,
          match_number: 37,
          home_score_90: 1,
          away_score_90: 1,
          advancing_tournament_team_id: 'A1',
          decision_method: 'penalties',
          joker_applied: true,
        }],
      },
      reference,
      competitionKey: LEAGUE_COMPETITION.KO_PREDICTOR,
    })
    expect(journey.matches[0]).toMatchObject({ visibility: 'visible', score: '1–1', jokerApplied: true })
    expect(journey.matches[1].visibility).toBe('private')
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
