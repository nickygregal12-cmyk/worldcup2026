import { describe, expect, it, vi } from 'vitest'
import { loadMyKoPredictionBundle, saveMyKoPredictionBundle } from '../koPredictorService.js'

describe('KO Predictor service', () => {
  it('uses the separate KO Predictor RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        prediction_set_id: 'ko-set', competition_key: 'ko_predictor', revision: 2,
        saved_prediction_count: 3, joker_count: 1,
      },
      error: null,
    })
    const result = await saveMyKoPredictionBundle({ rpc }, {
      tournamentId: 't1', expectedRevision: 1, predictions: [],
    })

    expect(rpc).toHaveBeenCalledWith('save_my_ko_prediction_bundle', {
      p_tournament_id: 't1', p_expected_revision: 1, p_predictions: [],
    })
    expect(result).toEqual({
      predictionSetId: 'ko-set', competitionKey: 'ko_predictor', revision: 2,
      savedPredictionCount: 3, jokerCount: 1,
    })
  })

  it('loads only the separate KO Predictor set', async () => {
    const setChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const client = { from: vi.fn().mockReturnValue(setChain) }
    await expect(loadMyKoPredictionBundle(client, 't1', 'u1')).resolves.toBeNull()
    expect(setChain.eq).toHaveBeenNthCalledWith(3, 'competition_key', 'ko_predictor')
  })
})
