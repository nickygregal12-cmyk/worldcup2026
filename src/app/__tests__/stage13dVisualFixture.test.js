import { describe, expect, it } from 'vitest'
import { buildLiveTournamentSnapshot } from '../../results/resultModel.js'
import {
  createStage13dVisualClient,
  VISUAL_STAGE13D_EXPECTATIONS,
  VISUAL_STAGE13D_REFERENCE,
  VISUAL_STAGE13D_RESULT_ROWS,
} from '../stage13dVisualFixture.js'

describe('Stage 13D signed-in visual fixture', () => {
  it('provides complete canonical match rows without changing the 51-match model', () => {
    expect(VISUAL_STAGE13D_REFERENCE.groupMatches).toHaveLength(36)
    expect(VISUAL_STAGE13D_REFERENCE.knockoutMatches).toHaveLength(15)
    expect(VISUAL_STAGE13D_RESULT_ROWS).toHaveLength(51)
    expect(VISUAL_STAGE13D_EXPECTATIONS.resultCount).toBe(51)
  })

  it('resolves realistic live groups and keeps later knockout participants honest', () => {
    const snapshot = buildLiveTournamentSnapshot({
      reference: VISUAL_STAGE13D_REFERENCE,
      resultRows: VISUAL_STAGE13D_RESULT_ROWS,
    })
    expect(Object.values(snapshot.groups).every(group => group.completedMatchCount === 6)).toBe(true)
    expect(snapshot.summary.liveMatches).toBe(1)
    expect(snapshot.summary.manualReviewResults).toBe(1)
    expect(snapshot.summary.resolvedKnockoutDecisions).toBe(3)
    expect(snapshot.knockout.byMatchNumber[45].participantsResolved).toBe(false)
  })

  it('returns separate league and points contracts from the visual client', async () => {
    const client = createStage13dVisualClient()
    const originalStandings = await client.rpc('get_league_standings', { p_competition_key: 'original' })
    const koStandings = await client.rpc('get_league_standings', { p_competition_key: 'ko_predictor' })
    const originalPoints = await client.rpc('get_my_competition_points', { p_competition_key: 'original' })
    const koPoints = await client.rpc('get_my_competition_points', { p_competition_key: 'ko_predictor' })

    expect(originalStandings.data).toHaveLength(VISUAL_STAGE13D_EXPECTATIONS.memberCount)
    expect(koStandings.data).toHaveLength(VISUAL_STAGE13D_EXPECTATIONS.memberCount)
    expect(originalPoints.data.total_points).toBe(VISUAL_STAGE13D_EXPECTATIONS.originalTotalPoints)
    expect(koPoints.data.total_points).toBe(VISUAL_STAGE13D_EXPECTATIONS.koTotalPoints)
    expect(originalPoints.data.total_points + koPoints.data.total_points).not.toBe(originalPoints.data.total_points)
  })

  it('releases KO fixture predictions only for started fixture rows', async () => {
    const client = createStage13dVisualClient()
    const response = await client.rpc('get_member_predictions_after_lock', {
      p_member_user_id: VISUAL_STAGE13D_EXPECTATIONS.currentUserId,
      p_competition_key: 'ko_predictor',
    })
    const startedNumbers = new Set(
      VISUAL_STAGE13D_REFERENCE.knockoutMatches
        .filter(match => ['live', 'paused', 'completed', 'abandoned'].includes(match.status))
        .map(match => match.matchNumber),
    )
    expect(response.data.match_predictions.every(row => startedNumbers.has(row.match_number))).toBe(true)
    expect(response.data.match_predictions).toHaveLength(startedNumbers.size)
  })
})
