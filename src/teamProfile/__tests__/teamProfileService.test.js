import { describe, expect, it } from 'vitest'
import { createStage13dVisualClient, STAGE13D_VISUAL_SCENARIO, VISUAL_STAGE13D_REFERENCE } from '../../app/stage13dVisualFixture.js'
import { loadTeamProfileSheet } from '../teamProfileService.js'

describe('teamProfileService', () => {
  it('loads the curated profile, app-owned tournament state and post-lock aggregates', async () => {
    const client = createStage13dVisualClient()
    const team = VISUAL_STAGE13D_REFERENCE.groups[0].teams[0]
    const result = await loadTeamProfileSheet(client, { reference: VISUAL_STAGE13D_REFERENCE, team })
    expect(result.status).toBe('ready')
    expect(result.profile.team.name).toBe('Scotland')
    expect(result.profile.curated.status).toBe('ready')
    expect(result.profile.predictions.aggregatesVisible).toBe(true)
    expect(result.tournament.group.code).toBe('A')
  })


  it('keeps canonical tournament data when the curated profile RPC fails', async () => {
    const visualClient = createStage13dVisualClient()
    const client = {
      ...visualClient,
      rpc(name, payload) {
        if (name === 'get_team_profile_sheet') {
          return Promise.resolve({ data: null, error: { message: 'Profile RPC unavailable' } })
        }
        return visualClient.rpc(name, payload)
      },
    }
    const team = VISUAL_STAGE13D_REFERENCE.groups[0].teams[0]
    const result = await loadTeamProfileSheet(client, { reference: VISUAL_STAGE13D_REFERENCE, team })
    expect(result.status).toBe('partial')
    expect(result.profile.team.name).toBe('Scotland')
    expect(result.profile.curated.status).toBe('empty')
    expect(result.tournament.status).toBe('ready')
    expect(result.errors[0]).toContain('Profile RPC unavailable')
  })

  it('does not receive aggregate prediction values in the pre-lock fixture', async () => {
    const client = createStage13dVisualClient({ scenario: STAGE13D_VISUAL_SCENARIO.PRIVACY })
    const team = VISUAL_STAGE13D_REFERENCE.groups[0].teams[0]
    const result = await loadTeamProfileSheet(client, { reference: VISUAL_STAGE13D_REFERENCE, team })
    expect(result.profile.predictions.aggregatesVisible).toBe(false)
    expect(result.profile.predictions.aggregates).toBeNull()
    expect(result.profile.predictions.viewerPrediction.predictedGroupWinner).toBe(true)
  })
})
