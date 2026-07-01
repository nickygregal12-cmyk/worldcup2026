import { describe, expect, it } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import {
  buildLiveTournamentSnapshot,
  mapStoredDecisionMethod,
  normaliseCanonicalResult,
  normaliseLeaderboard,
  RESULT_COMPETITION,
} from '../resultModel.js'

function reference() {
  return buildGuestReference()
}

describe('Stage 9 result model', () => {
  it('maps stored database methods without adding shoot-out kicks to the score', () => {
    expect(mapStoredDecisionMethod('regulation')).toBe('normal_time')
    expect(mapStoredDecisionMethod('penalties')).toBe('penalties')
  })

  it('hides void and manual-review scores from the live resolver', () => {
    const row = normaliseCanonicalResult({
      id: 'match-1', match_number: 1, status: 'completed', result_status: 'void',
      result_revision: 2, home_score_90: 4, away_score_90: 0,
    })
    expect(row.scoreVisible).toBe(false)
    expect(row.normalTimeHomeGoals).toBeNull()
  })

  it('uses live and pending scores in live group tables', () => {
    const model = reference()
    const first = model.groupMatches[0]
    const snapshot = buildLiveTournamentSnapshot({
      reference: model,
      resultRows: [{
        id: first.matchId, match_number: first.matchNumber, status: 'live', result_status: 'pending',
        result_revision: 1, home_score_90: 2, away_score_90: 0,
      }],
    })
    expect(snapshot.summary.liveMatches).toBe(1)
    expect(snapshot.groups[first.groupCode].completedMatchCount).toBe(1)
  })

  it('uses only confirmed completed winners to progress the live bracket', () => {
    const model = reference()
    const knockout = model.knockoutMatches[0]
    const snapshot = buildLiveTournamentSnapshot({
      reference: model,
      resultRows: [{
        id: knockout.matchId, match_number: knockout.matchNumber, status: 'live', result_status: 'pending',
        result_revision: 1, home_score_90: 1, away_score_90: 0, winner_tournament_team_id: knockout.homeTeamId,
      }],
    })
    expect(snapshot.summary.resolvedKnockoutDecisions).toBe(0)
  })

  it('keeps the live resolver context separate from guest and predicted records', () => {
    const snapshot = buildLiveTournamentSnapshot({ reference: reference(), resultRows: [] })
    expect(snapshot.context).toBe('live')
    expect(snapshot.results).toHaveLength(0)
  })

  it('normalises separate leaderboard rows', () => {
    const rows = normaliseLeaderboard([{
      rank: 1, user_id: 'user-1', display_name: 'Nicky', match_points: 30,
      bracket_points: 20, total_points: 50, scored_match_count: 1,
    }], RESULT_COMPETITION.ORIGINAL)
    expect(rows[0]).toMatchObject({ totalPoints: 50, competitionKey: 'original' })
    expect(() => normaliseLeaderboard([], 'combined')).toThrow('Unsupported leaderboard competition')
  })
})
