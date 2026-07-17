import { describe, expect, it } from 'vitest'
import { RESULT_COMPETITION } from '../../results/resultModel.js'
import { buildFixtureImpact, buildMatchCentreLeagueScopes, buildMatchCentreLifecycle, buildMatchCentreNavigation, buildPredictionTargetState } from '../matchCentreModel.js'

const reference = {
  tournamentId: 'tournament-1',
  teamsById: {
    a: { label: 'Alpha', fifaCode: 'ALP' },
    b: { label: 'Bravo', fifaCode: 'BRA' },
  },
  groupMatches: [
    { matchId: 'm1', matchNumber: 1, groupCode: 'A', homeTeamId: 'a', awayTeamId: 'b', scheduledDate: '2028-06-09' },
    { matchId: 'm2', matchNumber: 2, groupCode: 'A', homeTeamId: 'b', awayTeamId: 'a', scheduledDate: '2028-06-10' },
  ],
  knockoutMatches: [],
}

const liveSnapshot = {
  results: [{ matchId: 'm1', matchNumber: 1, status: 'completed', confirmed: true, scoreVisible: true, normalTimeHomeGoals: 2, normalTimeAwayGoals: 1, resultRevision: 1 }],
  knockout: { byMatchNumber: {} },
}

describe('Euro Match Centre model', () => {
  it('builds stable previous and next fixture navigation', () => {
    const navigation = buildMatchCentreNavigation({ reference, liveSnapshot, matchNumber: 2 })
    expect(navigation.current).toMatchObject({ matchNumber: 2, home: { label: 'Bravo' }, away: { label: 'Alpha' } })
    expect(navigation.previous).toMatchObject({ matchNumber: 1, score: '2–1', state: 'completed' })
    expect(navigation.next).toBeNull()
  })

  it('hides stale result metadata while a fixture is still upcoming', () => {
    const navigation = buildMatchCentreNavigation({
      reference,
      matchNumber: 2,
      liveSnapshot: {
        results: [{
          matchId: 'm2', status: 'scheduled', scoreVisible: true,
          normalTimeHomeGoals: 4, normalTimeAwayGoals: 1,
          decisionMethod: 'penalties', resultRevision: 3, winnerTeamId: 'b',
        }],
        knockout: { byMatchNumber: {} },
      },
    })

    expect(navigation.current).toMatchObject({
      state: 'upcoming', score: null, resultDetail: null, corrected: false, winnerTeamId: null,
    })
  })

  it('keeps private predictions protected and calculates only visible maximums', () => {
    const impact = buildFixtureImpact({
      members: [
        { userId: 'u1', displayName: 'Nicky', rank: 1, totalPoints: 30 },
        { userId: 'u2', displayName: 'Gary', rank: 2, totalPoints: 20 },
      ],
      bundlesByUserId: {
        u1: { visible: true, match_predictions: [{ match_number: 1, home_score_90: 2, away_score_90: 1, joker_applied: true }] },
        u2: { visible: false, reason: 'Not released.' },
      },
      competitionKey: RESULT_COMPETITION.ORIGINAL,
      matchNumber: 1,
      reference,
      currentUserId: 'u1',
    })
    expect(impact.visibleCount).toBe(1)
    expect(impact.privateCount).toBe(1)
    expect(impact.lines[0]).toMatchObject({ userId: 'u1', maximumPoints: 10, isCurrentUser: true })
    expect(impact.lines.find(row => row.userId === 'u2')).toMatchObject({ visibility: 'private', maximumPoints: 0 })
  })

  it('keeps KO maximums separate from Original scoring', () => {
    const impact = buildFixtureImpact({
      members: [{ userId: 'u1', displayName: 'Nicky', rank: 1, totalPoints: 0 }],
      bundlesByUserId: { u1: { visible: true, match_predictions: [{ match_number: 37, home_score_90: 1, away_score_90: 1, advancing_tournament_team_id: 'a', decision_method: 'penalties' }] } },
      competitionKey: RESULT_COMPETITION.KO_PREDICTOR,
      matchNumber: 37,
      reference,
      currentUserId: 'u1',
    })
    expect(impact.lines[0].maximumPoints).toBe(15)
    expect(impact.competitionKey).toBe(RESULT_COMPETITION.KO_PREDICTOR)
  })

  it('keeps Original and KO league scopes in separate Match Centre collections', () => {
    const leagues = [
      { id: 'original-1', name: 'Original Friends', competition: 'original' },
      { id: 'ko-1', name: 'KO Friends', competition: 'ko_predictor' },
    ]
    expect(buildMatchCentreLeagueScopes(leagues, 'ko_predictor', 'original-1')).toEqual({
      scopes: [{ id: 'overall', label: 'Overall' }, { id: 'ko-1', label: 'KO Friends' }],
      selectedLeague: null,
    })
    expect(buildMatchCentreLeagueScopes(leagues, 'ko_predictor', 'ko-1').selectedLeague.id).toBe('ko-1')
  })

  it('describes whether a released prediction is currently on target', () => {
    const liveFixture = { state: 'live', score: '2–1', confirmed: false }
    expect(buildPredictionTargetState({
      line: { visibility: 'visible', score: '2–1' }, fixture: liveFixture, competitionKey: 'original',
    })).toMatchObject({ key: 'exact', label: 'On target: exact score', tone: 'safe' })
    expect(buildPredictionTargetState({
      line: { visibility: 'visible', score: '0–1' }, fixture: liveFixture, competitionKey: 'original',
    })).toMatchObject({ key: 'different', tone: 'warning' })
  })

  it('marks a confirmed knockout advancer as correct or missed', () => {
    const fixture = { state: 'completed', confirmed: true, winnerTeamId: 'a', score: '1–1' }
    expect(buildPredictionTargetState({
      line: { visibility: 'visible', advancingTeamId: 'a', score: '1–1' }, fixture, competitionKey: 'ko_predictor',
    }).key).toBe('exact')
    expect(buildPredictionTargetState({
      line: { visibility: 'visible', advancingTeamId: 'b', score: '1–1' }, fixture, competitionKey: 'ko_predictor',
    })).toMatchObject({ key: 'lost', label: 'Pick missed' })
  })

  it('derives Match Centre lifecycle for live and unresolved knockout states', () => {
    const live = buildMatchCentreLifecycle({
      fixture: { matchNumber: 1, state: 'live', participantsResolved: true },
      competitionKey: RESULT_COMPETITION.ORIGINAL,
      lifecycle: { started: true },
    })
    expect(live).toMatchObject({ tone: 'danger', title: 'This fixture is live' })

    const unresolvedKo = buildMatchCentreLifecycle({
      fixture: { matchNumber: 37, state: 'upcoming', participantsResolved: false },
      competitionKey: RESULT_COMPETITION.KO_PREDICTOR,
      lifecycle: { started: true },
    })
    expect(unresolvedKo.title).toBe('Knockout participants are not known yet')
  })

})
