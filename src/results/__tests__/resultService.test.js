import { describe, expect, it, vi } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { loadOverallHeadToHead, loadResultsAndLeaderboards } from '../resultService.js'

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
    expect(data.currentUserId).toBe('user-1')
    expect(data.leaderboards.original[0].displayName).toBe('original')
    expect(data.leaderboards.koPredictor[0].displayName).toBe('ko_predictor')
    expect(client.rpc).toHaveBeenCalledTimes(4)
  })


  it('loads overall head-to-head bundles through the public post-lock RPC', async () => {
    const client = {
      rpc: vi.fn(async (_name, args) => ({
        data: {
          visible: true,
          match_predictions: [{
            match_number: 1,
            home_score_90: args.p_member_user_id === 'me' ? 2 : 1,
            away_score_90: 0,
          }],
          bracket_predictions: [],
        },
        error: null,
      })),
    }
    const data = await loadOverallHeadToHead(client, {
      tournamentId: 't1',
      currentUserId: 'me',
      otherUserId: 'them',
      competitionKey: 'original',
    })
    expect(data.comparison.visible).toBe(true)
    expect(data.comparison.comparedMatches).toBe(1)
    expect(data.comparison.exactScoreMatches).toBe(0)
    expect(client.rpc).toHaveBeenCalledWith('get_member_predictions_after_lock', {
      p_tournament_id: 't1',
      p_member_user_id: 'me',
      p_competition_key: 'original',
    })
  })

  it('surfaces canonical result read errors', async () => {
    const failing = query()
    failing.order = vi.fn(async () => ({ data: null, error: { message: 'nope' } }))
    const client = { from: vi.fn(() => failing), auth: { getSession: vi.fn() } }
    await expect(loadResultsAndLeaderboards(client, reference())).rejects.toThrow('Canonical result read failed: nope')
  })
})
