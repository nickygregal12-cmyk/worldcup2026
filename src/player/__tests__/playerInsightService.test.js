import { describe, expect, it, vi } from 'vitest'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import { loadPlayerInsightPair, readPlayerCompetitionPoints } from '../playerInsightService.js'

function responseFor(args) {
  return {
    visible: args.p_member_user_id !== 'protected-user',
    visibility_scope: 'global_original_lock',
    reason: args.p_member_user_id === 'protected-user' ? 'Private until lock.' : null,
    competition_key: args.p_competition_key,
    member_user_id: args.p_member_user_id,
    display_name: args.p_member_user_id,
    state: args.p_member_user_id === 'protected-user' ? 'protected' : 'scored',
    match_points: 5,
    bracket_points: 0,
    total_points: 5,
    scored_match_count: 1,
    match_breakdown: [{
      match_id: 'match-1', match_number: 1, matchday: 1,
      exact_score_points: 5, correct_outcome_points: 0,
      advancing_team_points: 0, decision_method_points: 0,
      joker_multiplier: 1, total_points: 5, result_revision: 1,
    }],
    bracket_breakdown: [],
  }
}

describe('player insight service', () => {
  it('reads one authorised player through the read-only insight RPC', async () => {
    const client = { rpc: vi.fn(async (_name, args) => ({ data: responseFor(args), error: null })) }
    const data = await readPlayerCompetitionPoints(client, {
      tournamentId: 't1', memberUserId: 'user-1', competitionKey: 'original', reference: buildGuestReference(),
    })

    expect(data.totalPoints).toBe(5)
    expect(data.matchBreakdown[0].matchNumber).toBe(1)
    expect(client.rpc).toHaveBeenCalledWith('get_player_competition_points', {
      p_tournament_id: 't1', p_member_user_id: 'user-1', p_competition_key: 'original',
    })
  })

  it('isolates a failed player insight so the comparison journey can remain usable', async () => {
    const client = {
      rpc: vi.fn(async (_name, args) => args.p_member_user_id === 'other-user'
        ? { data: null, error: { message: 'temporary failure' } }
        : { data: responseFor(args), error: null }),
    }
    const pair = await loadPlayerInsightPair(client, {
      tournamentId: 't1', currentUserId: 'me', otherUserId: 'other-user',
      competitionKey: 'original', reference: buildGuestReference(),
    })

    expect(pair.current.status).toBe('ready')
    expect(pair.other.status).toBe('error')
    expect(pair.other.error).toContain('temporary failure')
  })
})
