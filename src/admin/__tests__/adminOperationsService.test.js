import { describe, expect, it, vi } from 'vitest'
import {
  applyGlobalPredictionLock,
  grantAdminPredictionGrace,
  loadAdminAccess,
  loadAdminMatchHistory,
  loadAdminOperations,
  recalculateAdminMatchPoints,
  revokeAdminPredictionGrace,
  saveAdminMatchResult,
  searchAdminPredictionUsers,
  updateAdminMatchStatus,
  updateTournamentFeature,
  saveAdminTeamProfile,
  updateAdminMatchFixture,
  reconcileAdminTournamentPoints,
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
      if (name === 'admin_list_tournament_venues') return { data: [{ venue_id: 'v', venue_name: 'Hampden Park', venue_city: 'Glasgow', venue_timezone: 'Europe/London' }], error: null }
      if (name === 'admin_list_scoring_runs') return { data: [{ scoring_run_id: 'r', status: 'completed', started_at: '2026-07-01T10:00:00Z' }], error: null }
      if (name === 'admin_get_tournament_control_room') return { data: { admin_role: 'owner', lock: {}, health: { total_matches: 51 }, features: [], knockout_allocation: [], joker_locks: [] }, error: null }
      if (name === 'admin_list_prediction_grace') return { data: [], error: null }
      if (name === 'admin_list_operation_events') return { data: [], error: null }
      if (name === 'admin_list_team_profiles') return { data: [{ tournament_team_id: 'team-1', team_name: 'Scotland', profile_revision: 0 }], error: null }
      throw new Error(name)
    })
    const result = await loadAdminOperations(client, 't')
    expect(result.access.adminRole).toBe('owner')
    expect(result.matches[0].matchId).toBe('m')
    expect(result.venues[0]).toMatchObject({ venueId: 'v', venueName: 'Hampden Park' })
    expect(result.scoringRuns[0].scoringRunId).toBe('r')
    expect(result.controlRoom.health.totalMatches).toBe(51)
    expect(result.teamProfiles[0].teamName).toBe('Scotland')
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


  it('uses protected Stage 12 control-room RPCs', async () => {
    const client = clientWithRpc(async (name, args) => {
      if (name === 'admin_search_prediction_users') {
        expect(args.p_query).toBe('Member')
        return { data: [{ user_id: 'u', display_name: 'Member', has_original_predictions: true, has_ko_predictions: false }], error: null }
      }
      return { data: { operation: name }, error: null }
    })

    await applyGlobalPredictionLock(client, 't', 'Lock now after verification')
    await updateTournamentFeature(client, 't', { featureKey: 'result_entry', revision: 3 }, false, 'Pause manual results')
    const users = await searchAdminPredictionUsers(client, 't', 'Member')
    await grantAdminPredictionGrace(client, 't', { userId: 'u', matchId: 'm', competitionKey: 'original', expiresAt: '2028-06-09T12:00:00Z', reason: 'Support issue verified' })
    await revokeAdminPredictionGrace(client, 't', 'g', 'Issue resolved')

    expect(users[0]).toMatchObject({ userId: 'u', displayName: 'Member', hasOriginalPredictions: true })
    expect(client.rpc.mock.calls.map(call => call[0])).toEqual([
      'admin_apply_global_prediction_lock',
      'admin_update_feature_control',
      'admin_search_prediction_users',
      'admin_grant_prediction_grace',
      'admin_revoke_prediction_grace',
    ])
  })




  it('uses the protected fixture and whole-tournament recovery RPCs', async () => {
    const client = clientWithRpc(async (name, args) => {
      if (name === 'admin_update_match_fixture') {
        expect(args).toMatchObject({
          p_expected_fixture_revision: 3,
          p_scheduled_date: '2028-06-09',
          p_venue_id: 'venue-1',
          p_schedule_status: 'official_datetime',
        })
      }
      if (name === 'admin_reconcile_tournament_points') {
        expect(args.p_note).toBe('Rebuild all canonical totals')
      }
      return { data: { operation: name }, error: null }
    })
    const fixtureMatch = {
      ...match,
      fixtureRevision: 3,
      matchStatus: 'scheduled',
      resultStatus: 'pending',
      resultRevision: 0,
    }
    const venues = [{ venueId: 'venue-1', venueTimezone: 'Europe/London' }]
    await updateAdminMatchFixture(client, 't', fixtureMatch, {
      scheduledDate: '2028-06-09',
      kickoffLocal: '2028-06-09T20:00',
      venueId: 'venue-1',
      scheduleStatus: 'official_datetime',
      note: 'Official schedule confirmed',
    }, venues)
    await reconcileAdminTournamentPoints(client, 't', 'Rebuild all canonical totals')
    expect(client.rpc.mock.calls.map(call => call[0])).toEqual([
      'admin_update_match_fixture',
      'admin_reconcile_tournament_points',
    ])
  })

  it('saves an owner-curated team profile through the protected revision-safe RPC', async () => {
    const client = clientWithRpc(async (name, args) => {
      expect(name).toBe('admin_upsert_team_profile')
      expect(args).toMatchObject({ p_tournament_team_id: 'team-1', p_expected_revision: 2 })
      return { data: { profile_revision: 3 }, error: null }
    })
    const result = await saveAdminTeamProfile(client, 't', { tournamentTeamId: 'team-1', profileRevision: 2 }, {
      note: 'Update official team profile',
      payload: { ranking: 44, qualifying_route: 'Hosts', best_euro_finish: 'Group stage', editorial_note: 'A useful editorial profile note.' },
    })
    expect(result.profile_revision).toBe(3)
  })

  it('preserves database error codes for stale-write handling', async () => {
    const client = clientWithRpc(async () => ({ data: null, error: { message: 'stale', code: '40001' } }))
    await expect(loadAdminAccess(client, 't')).rejects.toMatchObject({ code: '40001' })
  })
})
