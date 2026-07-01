import { describe, expect, it, vi } from 'vitest'
import {
  hasActivePredictionGrace,
  isPredictionMatchStarted,
  loadMyPredictionGraceWindows,
} from '../predictionGraceService.js'

describe('prediction grace visibility', () => {
  it('scopes grace to one match and one competition', () => {
    const windows = [{
      match_id: 'm1', competition_key: 'original', granted_at: '2026-07-01T12:00:00Z',
      expires_at: '2026-07-01T14:00:00Z', revoked_at: null,
    }]
    expect(hasActivePredictionGrace(windows, {
      matchId: 'm1', competitionKey: 'original', now: '2026-07-01T13:00:00Z',
    })).toBe(true)
    expect(hasActivePredictionGrace(windows, {
      matchId: 'm1', competitionKey: 'ko_predictor', now: '2026-07-01T13:00:00Z',
    })).toBe(false)
    expect(hasActivePredictionGrace(windows, {
      matchId: 'm2', competitionKey: 'original', now: '2026-07-01T13:00:00Z',
    })).toBe(false)
  })

  it('rejects expired or revoked grace', () => {
    const expired = [{
      match_id: 'm1', competition_key: 'original', granted_at: '2026-07-01T12:00:00Z',
      expires_at: '2026-07-01T13:00:00Z', revoked_at: null,
    }]
    const revoked = [{ ...expired[0], expires_at: '2026-07-01T15:00:00Z', revoked_at: '2026-07-01T12:30:00Z' }]
    const options = { matchId: 'm1', competitionKey: 'original', now: '2026-07-01T14:00:00Z' }
    expect(hasActivePredictionGrace(expired, options)).toBe(false)
    expect(hasActivePredictionGrace(revoked, options)).toBe(false)
  })

  it('uses status or kick-off to identify a started match', () => {
    expect(isPredictionMatchStarted({ status: 'live', kickoffAt: null })).toBe(true)
    expect(isPredictionMatchStarted({ status: 'scheduled', kickoffAt: '2026-07-01T12:00:00Z' }, '2026-07-01T13:00:00Z')).toBe(true)
    expect(isPredictionMatchStarted({ status: 'scheduled', kickoffAt: '2026-07-01T14:00:00Z' }, '2026-07-01T13:00:00Z')).toBe(false)
  })

  it('loads only the signed-in users grace records', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }
    const client = { from: vi.fn().mockReturnValue(chain) }
    await expect(loadMyPredictionGraceWindows(client, 't1', 'u1')).resolves.toEqual([])
    expect(client.from).toHaveBeenCalledWith('prediction_grace_windows')
    expect(chain.eq).toHaveBeenNthCalledWith(1, 'tournament_id', 't1')
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'user_id', 'u1')
  })
})
