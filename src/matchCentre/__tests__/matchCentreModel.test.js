import { describe, expect, it } from 'vitest'
import { RESULT_COMPETITION } from '../../results/resultModel.js'
import { buildFixtureImpact, buildMatchCentreNavigation } from '../matchCentreModel.js'

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
    expect(impact.lines[0]).toMatchObject({ userId: 'u1', maximumPoints: 60, isCurrentUser: true })
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
    expect(impact.lines[0].maximumPoints).toBe(45)
    expect(impact.competitionKey).toBe(RESULT_COMPETITION.KO_PREDICTOR)
  })
})
