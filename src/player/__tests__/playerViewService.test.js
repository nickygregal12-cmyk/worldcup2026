import { describe, expect, it, vi } from 'vitest'
import { loadPlayerView } from '../playerViewService.js'
import { buildPlayerViewTestReference } from './playerViewTestReference.js'

const reference = buildPlayerViewTestReference()

// Minimal PostgREST-shaped stub: `.select().eq()...` chains, resolving either through
// `.maybeSingle()` or by awaiting the builder itself.
function tableClient(tables) {
  return table => {
    const result = tables[table] ?? { data: null, error: null }
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => result,
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    }
    return builder
  }
}

function client({ sessionUserId, tables = {}, sharedBundle = null }) {
  return {
    auth: { getSession: async () => ({ data: { session: { user: { id: sessionUserId } } }, error: null }) },
    rpc: vi.fn(async name => {
      if (name === 'get_competition_leaderboard') return { data: [], error: null }
      if (name === 'get_member_predictions_after_lock') return { data: sharedBundle, error: null }
      return { data: null, error: null }
    }),
    from: vi.fn(tableClient(tables)),
  }
}

const ownTables = {
  profiles: { data: { display_name: 'Nicky' }, error: null },
  prediction_sets: {
    data: { id: 'set-1', tournament_id: 'euro28-test', user_id: 'me', competition_key: 'original', revision: 3 },
    error: null,
  },
  match_predictions: {
    data: [{ match_id: 'match-1', home_score_90: 2, away_score_90: 1, joker_applied: true }],
    error: null,
  },
  bracket_predictions: {
    data: [{ match_id: 'match-37', advancing_tournament_team_id: 'team-scotland' }],
    error: null,
  },
}

// The pre-lock payload `get_member_predictions_after_lock` returns about anyone: no picks at all.
const preLockSharedBundle = {
  visible: false,
  reason: 'Original predictions remain private until the tournament prediction lock.',
  display_name: 'Dougie',
  match_predictions: [],
  bracket_predictions: [],
}

describe('player view service', () => {
  it('reads your own picks from your own rows, never the lock-gated RPC', async () => {
    const supabase = client({ sessionUserId: 'me', tables: ownTables })

    const result = await loadPlayerView(supabase, {
      reference,
      memberUserId: 'me',
      competitionKey: 'original',
      lifecycle: { locked: false },
    })

    const rpcNames = supabase.rpc.mock.calls.map(call => call[0])
    expect(rpcNames).not.toContain('get_member_predictions_after_lock')

    expect(result.isSelf).toBe(true)
    expect(result.view.player.displayName).toBe('Nicky')
    expect(result.view.release.state).toBe('released')
    expect(result.view.counts.visiblePredictions).toBe(1)
    expect(result.view.predictions[0].score).toBe('2–1')
    expect(result.view.bracketSummary.visibleCount).toBe(1)
    expect(result.view.bracket[0].advancingTeamLabel).toBe('Scotland')
  })

  it('treats an omitted member id as your own player view', async () => {
    const supabase = client({ sessionUserId: 'me', tables: ownTables })
    const result = await loadPlayerView(supabase, { reference, lifecycle: { locked: false } })

    expect(result.isSelf).toBe(true)
    expect(result.memberUserId).toBe('me')
    expect(result.view.counts.visiblePredictions).toBe(1)
  })

  it('still hides another player’s picks before the lock', async () => {
    const supabase = client({ sessionUserId: 'me', sharedBundle: preLockSharedBundle })

    const result = await loadPlayerView(supabase, {
      reference,
      memberUserId: 'dougie',
      competitionKey: 'original',
      lifecycle: { locked: false },
    })

    const rpcNames = supabase.rpc.mock.calls.map(call => call[0])
    expect(rpcNames).toContain('get_member_predictions_after_lock')
    expect(supabase.from).not.toHaveBeenCalled()

    expect(result.isSelf).toBe(false)
    expect(result.view.release.state).toBe('protected')
    expect(result.view.counts.visiblePredictions).toBe(0)
    expect(result.view.predictions[0].visibility).toBe('private')
  })

  it('reads your own KO picks from your own rows before their fixtures start', async () => {
    const supabase = client({
      sessionUserId: 'me',
      tables: {
        profiles: { data: { display_name: 'Nicky' }, error: null },
        prediction_sets: {
          data: { id: 'set-2', tournament_id: 'euro28-test', user_id: 'me', competition_key: 'ko_predictor', revision: 1 },
          error: null,
        },
        match_predictions: {
          data: [{ match_id: 'match-37', home_score_90: 1, away_score_90: 0, advancing_tournament_team_id: 'team-scotland' }],
          error: null,
        },
      },
    })

    const result = await loadPlayerView(supabase, {
      reference,
      memberUserId: 'me',
      competitionKey: 'ko_predictor',
      lifecycle: { locked: false },
    })

    expect(result.view.release.state).toBe('released')
    expect(result.view.predictions[0].visibility).toBe('visible')
  })
})
