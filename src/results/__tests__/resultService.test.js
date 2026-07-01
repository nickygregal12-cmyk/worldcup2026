import { describe, expect, it, vi } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { loadResultsAndLeaderboards } from '../resultService.js'

function query(data = []) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(async () => ({ data, error: null })),
  }
  return builder
}

function reference() {
  return buildGuestReference()
}

describe('Stage 9 result service', () => {
  it('keeps guest result reads unscored and avoids leaderboard RPCs', async () => {
    const client = {
      from: vi.fn(() => query()),
      auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })) },
      rpc: vi.fn(),
    }
    const data = await loadResultsAndLeaderboards(client, reference())
    expect(data.signedIn).toBe(false)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('reads original and KO Predictor leaderboards separately', async () => {
    const client = {
      from: vi.fn(() => query()),
      auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null })) },
      rpc: vi.fn(async (name, args) => {
        if (name === 'get_competition_leaderboard') {
          return { data: [{ rank: 1, user_id: 'user-1', display_name: args.p_competition_key, total_points: 10 }], error: null }
        }
        return { data: { competition_key: args.p_competition_key, total_points: 10 }, error: null }
      }),
    }
    const data = await loadResultsAndLeaderboards(client, reference())
    expect(data.leaderboards.original[0].displayName).toBe('original')
    expect(data.leaderboards.koPredictor[0].displayName).toBe('ko_predictor')
    expect(client.rpc).toHaveBeenCalledTimes(4)
  })

  it('surfaces canonical result read errors', async () => {
    const failing = query()
    failing.order = vi.fn(async () => ({ data: null, error: { message: 'nope' } }))
    const client = { from: vi.fn(() => failing), auth: { getSession: vi.fn() } }
    await expect(loadResultsAndLeaderboards(client, reference())).rejects.toThrow('Canonical result read failed: nope')
  })
})
