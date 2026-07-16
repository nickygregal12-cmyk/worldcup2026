import { describe, expect, it, vi } from 'vitest'
import {
  createLeague,
  getLeagueStandings,
  getMyLeagues,
  joinLeague,
  loadLeagueHeadToHead,
  loadLeagueOverview,
} from '../leagueService.js'

function rpcClient(responses) {
  return {
    rpc: vi.fn(async name => responses[name] ?? { data: null, error: null }),
  }
}

describe('league service', () => {
  it('loads and normalises member leagues, including a backfilled original competition', async () => {
    const client = rpcClient({
      get_my_leagues: {
        data: [{
          league_id: 'l1', league_name: 'Family', join_code: 'ABCDEF1234', competition: 'original',
          member_role: 'owner', member_count: 3, created_at: null,
        }],
        error: null,
      },
    })
    const leagues = await getMyLeagues(client, 't1')
    expect(leagues[0]).toMatchObject({ id: 'l1', memberCount: 3, competition: 'original' })
    expect(client.rpc).toHaveBeenCalledWith('get_my_leagues', { p_tournament_id: 't1' })
  })

  it('passes validated inputs to create and join RPCs, including the now-required competition', async () => {
    const client = rpcClient({
      create_my_league: { data: { league_id: 'l1' }, error: null },
      join_league_by_code: { data: { league_id: 'l2' }, error: null },
    })
    await createLeague(client, { tournamentId: 't1', name: 'Friends', competition: 'original' })
    // Joining never names a competition -- it naturally joins whichever competition the league
    // (identified by its code) already belongs to.
    await joinLeague(client, { tournamentId: 't1', joinCode: 'ABCDEF1234' })
    expect(client.rpc).toHaveBeenNthCalledWith(1, 'create_my_league', {
      p_tournament_id: 't1', p_name: 'Friends', p_competition: 'original',
    })
    expect(client.rpc).toHaveBeenNthCalledWith(2, 'join_league_by_code', {
      p_tournament_id: 't1', p_join_code: 'ABCDEF1234',
    })
  })

  it('rejects league creation without a real competition before ever calling the database', async () => {
    const client = rpcClient({})
    await expect(createLeague(client, { tournamentId: 't1', name: 'Friends' })).rejects.toThrow()
    await expect(createLeague(client, { tournamentId: 't1', name: 'Friends', competition: 'both' })).rejects.toThrow()
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('rejects KO league creation client-side before KO readiness, as defense in depth ahead of the database gate', async () => {
    const client = rpcClient({})
    await expect(createLeague(client, {
      tournamentId: 't1',
      name: 'KO Sweepstake',
      competition: 'ko_predictor',
      koReadiness: { earlyAccess: false, primaryReady: false },
    })).rejects.toThrow(/KO Predictor leagues cannot be created/)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('allows KO league creation once earlyAccess is reached, without waiting for the stricter primaryReady', async () => {
    const client = rpcClient({
      create_my_league: { data: { league_id: 'l3', competition: 'ko_predictor' }, error: null },
    })
    await createLeague(client, {
      tournamentId: 't1',
      name: 'KO Sweepstake',
      competition: 'ko_predictor',
      koReadiness: { earlyAccess: true, primaryReady: false },
    })
    expect(client.rpc).toHaveBeenCalledWith('create_my_league', {
      p_tournament_id: 't1', p_name: 'KO Sweepstake', p_competition: 'ko_predictor',
    })
  })

  it('does not require koReadiness client-side and still calls the database, which remains the authoritative gate', async () => {
    const client = rpcClient({
      create_my_league: { data: { league_id: 'l4' }, error: null },
    })
    await createLeague(client, { tournamentId: 't1', name: 'KO Sweepstake', competition: 'ko_predictor' })
    expect(client.rpc).toHaveBeenCalledWith('create_my_league', {
      p_tournament_id: 't1', p_name: 'KO Sweepstake', p_competition: 'ko_predictor',
    })
  })

  it('keeps competition key explicit when reading standings', async () => {
    const client = rpcClient({
      get_league_standings: {
        data: [{ rank: 1, user_id: 'u1', display_name: 'A', total_points: 5 }],
        error: null,
      },
    })
    const rows = await getLeagueStandings(client, { leagueId: 'l1', competitionKey: 'ko_predictor' })
    expect(rows[0].totalPoints).toBe(5)
    expect(client.rpc).toHaveBeenCalledWith('get_league_standings', {
      p_league_id: 'l1', p_competition_key: 'ko_predictor',
    })
  })

  it('loads only the fixed competition table for the selected league', async () => {
    const client = {
      rpc: vi.fn(async () => ({
        data: [{ rank: 1, user_id: 'me', display_name: 'Nicky', total_points: 10, is_current_user: true }],
        error: null,
      })),
    }
    const overview = await loadLeagueOverview(client, { leagueId: 'l1', competitionKey: 'original' })
    expect(overview.status).toBe('ready')
    expect(overview.competitionKey).toBe('original')
    expect(overview.standings).toHaveLength(1)
    expect(overview.summary.competitionKey).toBe('original')
    expect(client.rpc).toHaveBeenCalledTimes(1)
    expect(client.rpc).toHaveBeenCalledWith('get_league_standings', {
      p_league_id: 'l1', p_competition_key: 'original',
    })
  })

  it('rejects an overview without an explicit fixed competition', async () => {
    const client = rpcClient({})
    await expect(loadLeagueOverview(client, { leagueId: 'l1' })).rejects.toThrow(/Choose Original Predictor or KO Predictor/)
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('loads two member bundles and isolated canonical insight for a head-to-head comparison', async () => {
    const client = {
      rpc: vi.fn(async (name, args) => {
        if (name === 'get_player_competition_points') {
          return {
            data: {
              visible: true,
              competition_key: args.p_competition_key,
              member_user_id: args.p_member_user_id,
              display_name: args.p_member_user_id,
              state: 'unscored',
              total_points: 0,
              match_breakdown: [],
              bracket_breakdown: [],
              reason: null,
            },
            error: null,
          }
        }
        return {
          data: {
            visible: true,
            display_name: args.p_member_user_id,
            match_predictions: [{ match_number: 1, home_score_90: 1, away_score_90: 0 }],
            bracket_predictions: [],
          },
          error: null,
        }
      }),
    }
    const result = await loadLeagueHeadToHead(client, {
      leagueId: 'l1', currentUserId: 'me', otherUserId: 'them', competitionKey: 'original',
      tournamentId: 't1', reference: { tournamentId: 't1', groupMatches: [], knockoutMatches: [], teamsById: {} },
    })
    expect(result.comparison.visible).toBe(true)
    expect(result.comparison.exactScoreMatches).toBe(1)
    expect(result.insights.current.status).toBe('ready')
    expect(client.rpc).toHaveBeenCalledTimes(4)
  })

  it('surfaces RPC errors with context', async () => {
    const client = rpcClient({
      get_my_leagues: { data: null, error: { message: 'denied' } },
    })
    await expect(getMyLeagues(client, 't1')).rejects.toThrow('League list failed: denied')
  })
})
