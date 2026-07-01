import { describe, expect, it, vi } from 'vitest'
import { buildGuestReference, ALL_HOME_KNOCKOUT, COMPLETE_GROUP_SCORES } from '../../guest/__tests__/fixtures.js'
import { createGuestPredictionState, updateGuestGroupPrediction, updateGuestKnockoutPrediction } from '../../guest/guestPredictionState.js'
import { importGuestDraftToAccount, loadMyPredictionBundle, saveMyPredictionBundle } from '../predictionSaveService.js'

function completeState(reference) {
  let state = createGuestPredictionState(reference)
  for (let matchNumber = 1; matchNumber <= 36; matchNumber += 1) {
    const [homeScore, awayScore] = COMPLETE_GROUP_SCORES[(matchNumber - 1) % 6]
    state = updateGuestGroupPrediction(state, { matchNumber, homeScore, awayScore })
  }
  for (const [matchNumber, advancingTeamId] of ALL_HOME_KNOCKOUT) {
    state = updateGuestKnockoutPrediction(state, {
      matchNumber, homeScore: 2, awayScore: 0, advancingTeamId, decisionMethod: 'normal_time',
    })
  }
  return state
}

describe('prediction save service', () => {
  it('calls only the atomic RPC and normalises its result', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        prediction_set_id: 'set-1', tournament_id: 't1', revision: 3,
        submitted_at: null, guest_imported_at: null, last_save_source: 'account', saved_prediction_count: 1,
      },
      error: null,
    })
    const result = await saveMyPredictionBundle({ rpc }, {
      tournamentId: 't1', expectedRevision: 2, submitted: false, source: 'account',
      predictions: [{
        match_id: 'm1', predicted_home_tournament_team_id: 'a', predicted_away_tournament_team_id: 'b',
        home_score_90: 1, away_score_90: 0, advancing_tournament_team_id: null,
        decision_method: null, joker_applied: false,
      }],
    })
    expect(rpc).toHaveBeenCalledWith('save_my_prediction_bundle', expect.objectContaining({ p_expected_revision: 2 }))
    expect(result).toMatchObject({ predictionSetId: 'set-1', revision: 3, savedPredictionCount: 1 })
  })

  it('builds an explicit guest import request', async () => {
    const reference = buildGuestReference()
    const rpc = vi.fn().mockResolvedValue({
      data: {
        prediction_set_id: 'set-1', tournament_id: reference.tournamentId, revision: 1,
        submitted_at: null, guest_imported_at: '2026-07-01T20:00:00Z',
        last_save_source: 'guest_import', saved_prediction_count: 51,
      },
      error: null,
    })
    const result = await importGuestDraftToAccount({ rpc }, {
      reference, state: completeState(reference), expectedRevision: 0,
    })
    expect(rpc).toHaveBeenCalledWith('save_my_prediction_bundle', expect.objectContaining({
      p_source: 'guest_import',
      p_predictions: expect.arrayContaining([expect.objectContaining({ match_id: 'match-51' })]),
    }))
    expect(result.savedPredictionCount).toBe(51)
  })

  it('loads only the signed-in owners prediction set', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const client = { from: vi.fn().mockReturnValue(chain) }
    await expect(loadMyPredictionBundle(client, 't1', 'user-1')).resolves.toBeNull()
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'tournament_id', 't1')
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-1')
  })
})
