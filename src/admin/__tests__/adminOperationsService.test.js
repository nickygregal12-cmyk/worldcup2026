import { describe, expect, it, vi } from 'vitest'
import {
  loadAdminAccess,
  loadAdminMatchHistory,
  loadAdminOperations,
  recalculateAdminMatchPoints,
  saveAdminMatchResult,
  updateAdminMatchStatus,
} from '../adminOperationsService.js'

function clientWithRpc(handler) {
  return { rpc: vi.fn(handler) }
}

const match = Object.freeze({
  matchId: 'match-1', matchNumber: 1, resultRevision: 2,
  matchStatus: 'completed', resultStatus: 'confirmed', resultMethod: 'regulation',
  homeTeamId: 'home', awayTeamId: 'away', homeScore90: 1, awayScore90: 0,
  homeScoreAet: null, awayScoreAet: null, homePenalties: null, awayPenalties: null,
})

describe('admin operations service', () => {
  it('loads access and stops before protected RPCs for non-admins', async () => {
    const client = clientWithRpc(async name => {
      expect(name).toBe('get_my_tournament_admin_access')
      return { data: { is_admin: false, tournament_id: 't' }, error: null }
    })
    await expect(loadAdminOperations(client, 't')).resolves.toMatchObject({ matches: [], scoringRuns: [] })
    expect(client.rpc).toHaveBeenCalledTimes(1)
  })

  it('loads the admin match list and scoring runs', async () => {
    const client = clientWithRpc(async name => {
      if (name === 'get_my_tournament_admin_access') return { data: { is_admin: true, admin_role: 'owner' }, error: null }
      if (name === 'admin_list_tournament_matches') return { data: [{ match_id: 'm', match_number: 1, match_status: 'scheduled', result_status: 'pending', result_revision: 0 }], error: null }
      if (name === 'admin_list_scoring_runs') return { data: [{ scoring_run_id: 'r', status: 'completed', started_at: '2026-07-01T10:00:00Z' }], error: null }
      throw new Error(name)
    })
    const result = await loadAdminOperations(client, 't')
    expect(result.access.adminRole).toBe('owner')
    expect(result.matches[0].matchId).toBe('m')
    expect(result.scoringRuns[0].scoringRunId).toBe('r')
  })

  it('normalises history rows', async () => {
    const client = clientWithRpc(async () => ({ data: [{ event_id: 'e', result_revision: 3, event_type: 'corrected', created_at: '2026-07-01T10:00:00Z' }], error: null }))
    const history = await loadAdminMatchHistory(client, 't', 'm')
    expect(history[0]).toMatchObject({ eventId: 'e', resultRevision: 3 })
  })

  it('sends the expected revision and validated result payload', async () => {
    const client = clientWithRpc(async (_name, args) => {
      expect(args.p_expected_result_revision).toBe(2)
      expect(args.p_payload.winner_tournament_team_id).toBe('home')
      return { data: { result_revision: 3 }, error: null }
    })
    const result = await saveAdminMatchResult(client, 't', match, {
      matchStatus: 'completed', resultStatus: 'confirmed', decisionMethod: 'normal_time',
      homeScore90: 2, awayScore90: 0, homeScoreAet: '', awayScoreAet: '',
      homePenalties: '', awayPenalties: '', note: 'Official correction checked',
    })
    expect(result.result_revision).toBe(3)
  })

  it('uses dedicated status and recalculation RPCs', async () => {
    const client = clientWithRpc(async name => ({ data: { operation: name }, error: null }))
    await updateAdminMatchStatus(client, 't', match, 'completed', 'Status checked manually')
    await recalculateAdminMatchPoints(client, 't', match, 'Recalculate after verification')
    expect(client.rpc.mock.calls.map(call => call[0])).toEqual([
      'admin_update_match_status',
      'admin_recalculate_match_points',
    ])
  })

  it('preserves database error codes for stale-write handling', async () => {
    const client = clientWithRpc(async () => ({ data: null, error: { message: 'stale', code: '40001' } }))
    await expect(loadAdminAccess(client, 't')).rejects.toMatchObject({ code: '40001' })
  })
})
