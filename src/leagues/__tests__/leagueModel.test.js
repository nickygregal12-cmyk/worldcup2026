import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import {
  buildLeagueCompetitionLifecycleCopy,
  buildLeagueCompetitionSummary,
  buildLeagueLifecycleState,
  buildLeagueRaceRows,
  buildLeagueRaceSummary,
  buildSharedLeagueMemberList,
  buildSharedPredictionJourney,
  buildStandingComparison,
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
    const original = [
      normaliseStanding({
        rank: 1, user_id: 'leader', display_name: 'Amy', match_points: 40,
        bracket_points: 10, total_points: 50, scored_match_count: 3, is_current_user: false,
      }),
      normaliseStanding({
        rank: 2, user_id: 'me', display_name: 'Nicky', match_points: 20,
        bracket_points: 10, total_points: 30, scored_match_count: 3, is_current_user: true,
      }),
    ]
    const summary = buildLeagueCompetitionSummary(original, LEAGUE_COMPETITION.ORIGINAL)
    expect(summary).toMatchObject({
      currentRank: 2,
      currentPoints: 30,
      leaderName: 'Amy',
      leaderPoints: 50,
      gapToLeader: 20,
      gapToLeaderLabel: '20 behind leader',
      state: 'active',
    })
    expect(() => buildLeagueCompetitionSummary([], 'combined')).toThrow('Unsupported league competition')
  })

  it('builds league race rows with top-three, current-user anchor and gap to leader', () => {
    const rows = [
      { userId: 'leader', displayName: 'Amy', rank: 1, totalPoints: 80, matchPoints: 70, bracketPoints: 10, scoredMatchCount: 5, isCurrentUser: false },
      { userId: 'me', displayName: 'Nicky', rank: 2, totalPoints: 63, matchPoints: 53, bracketPoints: 10, scoredMatchCount: 5, isCurrentUser: true },
      { userId: 'third', displayName: 'Zara', rank: 3, totalPoints: 61, matchPoints: 51, bracketPoints: 10, scoredMatchCount: 5, isCurrentUser: false },
      { userId: 'fourth', displayName: 'Ben', rank: 4, totalPoints: 40, matchPoints: 30, bracketPoints: 10, scoredMatchCount: 5, isCurrentUser: false },
    ]

    const raceRows = buildLeagueRaceRows(rows)
    expect(raceRows[0]).toMatchObject({ podium: 'top-1', podiumLabel: 'Top spot', gapToLeaderLabel: 'Leader' })
    expect(raceRows[1]).toMatchObject({ podium: 'top-2', rankStoryLabel: 'YOU', gapToLeader: 17, gapToLeaderLabel: '17 behind leader' })
    expect(raceRows[2]).toMatchObject({ podium: 'top-3', podiumLabel: 'Top three' })
    expect(raceRows[3].podium).toBeNull()
    expect(raceRows[1].rankMovementLabel).toBeNull()
    expect(raceRows[1].rankMovementReason).toContain('previous-rank data')
  })

  it('builds a league race summary strip model without combining competitions', () => {
    const rows = [
      { userId: 'leader', displayName: 'Amy', rank: 1, totalPoints: 80, matchPoints: 70, bracketPoints: 10, scoredMatchCount: 5, isCurrentUser: false },
      { userId: 'me', displayName: 'Nicky', rank: 2, totalPoints: 63, matchPoints: 53, bracketPoints: 10, scoredMatchCount: 5, isCurrentUser: true },
    ]

    const summary = buildLeagueRaceSummary(rows, LEAGUE_COMPETITION.ORIGINAL)
    expect(summary).toMatchObject({
      competitionKey: LEAGUE_COMPETITION.ORIGINAL,
      competitionLabel: 'Original Predictor',
      state: 'active',
      headline: 'You are 17 behind leader',
      currentLabel: '2nd · 63 pts',
      leaderLabel: 'Amy · 80 pts',
      gapLabel: '17 behind leader',
      gapToLeader: 17,
    })
    expect(() => buildLeagueRaceSummary(rows, 'combined')).toThrow('Unsupported league competition')
  })

  it('builds pre-scoring and empty league race summary states', () => {
    expect(buildLeagueRaceSummary([], LEAGUE_COMPETITION.KO_PREDICTOR)).toMatchObject({
      state: 'empty',
      competitionLabel: 'KO Predictor',
      gapLabel: 'Race starts when members appear',
    })

    expect(buildLeagueRaceSummary([
      { userId: 'me', displayName: 'Nicky', rank: 1, totalPoints: 0, matchPoints: 0, bracketPoints: 0, scoredMatchCount: 0, isCurrentUser: true },
    ], LEAGUE_COMPETITION.ORIGINAL)).toMatchObject({
      state: 'pre_scoring',
      headline: 'Original Predictor race has not started',
      gapLabel: 'No points scored yet',
    })
  })


  it('builds league lifecycle copy without combining Original and KO states', () => {
    const state = buildLeagueLifecycleState({
      lifecycle: { locked: false, tournamentStarted: false },
      originalSummary: { state: 'pre_competition' },
      koSummary: { state: 'pre_competition' },
    })
    expect(state.originalState).toBe('pre_lock')
    expect(state.koState).toBe('waiting_for_knockout_fixtures')
    expect(state.originalCopy).toContain('global prediction lock')
    expect(state.koCopy).toContain('shared KO-readiness signal')
  })

  it('keeps KO league tables waiting when the tournament has started but KO readiness is closed', () => {
    const state = buildLeagueLifecycleState({
      lifecycle: { locked: true, tournamentStarted: true },
      originalSummary: { state: 'active' },
      koSummary: { state: 'active' },
      koReadiness: { open: false, available: 0, label: 'KO Predictor opens when real fixtures are known' },
    })

    expect(state.koState).toBe('waiting_for_knockout_fixtures')
    expect(state.koReadiness.open).toBe(false)
  })

  it('describes competition-scoped league release rules', () => {
    expect(buildLeagueCompetitionLifecycleCopy({
      competitionKey: LEAGUE_COMPETITION.ORIGINAL,
      lifecycle: { locked: false },
      summary: { state: 'pre_competition' },
    })).toMatchObject({ state: 'private_until_lock', label: 'Private until global lock' })

    expect(buildLeagueCompetitionLifecycleCopy({
      competitionKey: LEAGUE_COMPETITION.KO_PREDICTOR,
      lifecycle: { tournamentStarted: true },
      summary: { state: 'pre_competition' },
      koReadiness: { open: true, available: 1 },
    })).toMatchObject({ state: 'fixture_release', label: 'Fixture-by-fixture release' })
  })

  it('builds a competition-scoped head-to-head standing summary', () => {
    const rows = [
      { userId: 'me', displayName: 'Nicky', rank: 3, totalPoints: 40, matchPoints: 30, bracketPoints: 10, scoredMatchCount: 4, isCurrentUser: true },
      { userId: 'them', displayName: 'Amy', rank: 1, totalPoints: 55, matchPoints: 45, bracketPoints: 10, scoredMatchCount: 4, isCurrentUser: false },
    ]
    const summary = buildStandingComparison(rows, 'them')
    expect(summary.current).toMatchObject({ userId: 'me', rank: 3, totalPoints: 40 })
    expect(summary.other).toMatchObject({ userId: 'them', rank: 1, totalPoints: 55 })
    expect(summary).not.toHaveProperty('combinedPoints')
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
    expect(journey.visibleSelectionCount).toBe(0)
    expect(journey.releaseState).toBe('private_until_global_lock')
    expect(journey.releaseCopy).toContain('global prediction lock')
    expect(journey.privateSelectionCount).toBe(51)
    expect(journey.totalSelectionCount).toBe(51)
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
    expect(journey.visibleSelectionCount).toBe(1)
    expect(journey.releaseState).toBe('fixture_release_started')
    expect(journey.releaseCopy).toContain('fixture by fixture')
    expect(journey.privateSelectionCount).toBe(14)
    expect(journey.totalSelectionCount).toBe(15)
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
