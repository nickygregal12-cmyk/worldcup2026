import { describe, expect, it } from 'vitest'
import { VISUAL_STAGE13D_REFERENCE, VISUAL_STAGE13D_RESULT_ROWS } from '../../testFixtures/stage13dVisualFixture.js'
import { buildLiveTournamentSnapshot } from '../../results/resultModel.js'
import { buildTeamProfileLifecycle, buildTeamTournamentSummary, mergeTeamProfileSections, normaliseTeamProfilePayload } from '../teamProfileModel.js'

describe('teamProfileModel', () => {
  it('normalises curated, aggregate and viewer data without combining competitions', () => {
    const result = normaliseTeamProfilePayload({
      team: { tournament_team_id: 'team-1', name: 'Scotland', iso_code: 'SCO', is_provisional: true },
      curated: { status: 'ready', ranking: 44, qualifying_route: 'Hosts', best_euro_finish: 'Group stage', editorial_note: 'Sample note for testing.', profile_revision: 2 },
      predictions: {
        aggregates_visible: true,
        eligible_prediction_count: 10,
        aggregates: { group_winner_percentage: 40, champion_percentage: 10 },
        viewer_prediction: { has_original_prediction_set: true, bracket_pick_count: 15, predicted_champion: false },
      },
    })
    expect(result.team.name).toBe('Scotland')
    expect(result.curated.profileRevision).toBe(2)
    expect(result.predictions.aggregates.championPercentage).toBe(10)
    expect(result.predictions.viewerPrediction.bracketPickCount).toBe(15)
    expect(result.predictions).not.toHaveProperty('koPredictor')
  })

  it('preserves the pre-lock aggregate privacy boundary', () => {
    const result = normaliseTeamProfilePayload({ predictions: { aggregates_visible: false, aggregates: null, eligible_prediction_count: null } })
    expect(result.predictions.aggregatesVisible).toBe(false)
    expect(result.predictions.aggregates).toBeNull()
    expect(result.predictions.eligiblePredictionCount).toBeNull()
  })

  it('derives current group position, canonical results and the next fixture from app-owned data', () => {
    const live = buildLiveTournamentSnapshot({ reference: VISUAL_STAGE13D_REFERENCE, resultRows: VISUAL_STAGE13D_RESULT_ROWS })
    const teamId = VISUAL_STAGE13D_REFERENCE.groups[0].teams[1].teamId
    const result = buildTeamTournamentSummary({ reference: VISUAL_STAGE13D_REFERENCE, liveSnapshot: live, tournamentTeamId: teamId })
    expect(result.group.code).toBe('A')
    expect(result.group.played).toBeGreaterThan(0)
    expect(result.results.length).toBeGreaterThan(0)
    expect(result.nextFixture).not.toBeNull()
  })

  it('reports partial success when one of the three-source sections fails', () => {
    const merged = mergeTeamProfileSections({
      contentResult: { status: 'fulfilled', value: { team: { tournament_team_id: 'team-1', name: 'Scotland' } } },
      tournamentResult: { status: 'rejected', reason: new Error('Result feed failed') },
      fallbackTeam: { teamId: 'team-1', label: 'Scotland' },
    })
    expect(merged.status).toBe('partial')
    expect(merged.profile.team.name).toBe('Scotland')
    expect(merged.tournament.status).toBe('error')
  })

  it('derives Team Profile lifecycle copy from central lock state and keeps KO excluded', () => {
    const preLock = buildTeamProfileLifecycle({
      lifecycle: { locked: false },
      predictions: { aggregatesVisible: false },
    })
    const released = buildTeamProfileLifecycle({
      lifecycle: { locked: true },
      predictions: { aggregatesVisible: true },
    })

    expect(preLock.copy).toContain('global Original Predictor lock')
    expect(preLock.copy).toContain('KO Predictor data is not included')
    expect(released.copy).toContain('complete Original Predictor brackets only')
    expect(released.copy).toContain('no Original/KO points are combined')
  })

})