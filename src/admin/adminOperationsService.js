import {
  buildAdminResultPayload,
  normaliseAdminAccess,
  normaliseAdminControlRoom,
  normaliseAdminHistory,
  normaliseAdminMatch,
  normaliseAdminOperationEvents,
  normaliseAdminUserSearch,
  normaliseAdminTeamProfiles,
  normalisePredictionGrace,
  normaliseScoringRuns,
} from './adminOperationsModel.js'
import { parseExternal } from '../contracts/externalValidation.js'
import { adminAccessSchema, adminRecordRowsSchema, adminRecordSchema, mutationResultSchema } from '../contracts/externalSchemas.js'

function throwForError(label, error) {
  if (!error) return
  const wrapped = new Error(`${label}: ${error.message}`)
  wrapped.code = error.code ?? null
  throw wrapped
}

export async function loadAdminAccess(client, tournamentId) {
  if (!client) throw new Error('The Euro staging database client is unavailable.')
  const response = await client.rpc('get_my_tournament_admin_access', {
    p_tournament_id: tournamentId,
  })
  throwForError('Admin access check failed', response.error)
  return normaliseAdminAccess(parseExternal(adminAccessSchema, response.data ?? null, 'Admin access response'))
}

export async function loadAdminOperations(client, tournamentId) {
  const access = await loadAdminAccess(client, tournamentId)
  if (!access.isAdmin) {
    return Object.freeze({ access, matches: [], scoringRuns: [] })
  }

  const [matchesResponse, runsResponse, controlResponse, graceResponse, timelineResponse, teamProfilesResponse] = await Promise.all([
    client.rpc('admin_list_tournament_matches', { p_tournament_id: tournamentId }),
    client.rpc('admin_list_scoring_runs', { p_tournament_id: tournamentId, p_limit: 25 }),
    client.rpc('admin_get_tournament_control_room', { p_tournament_id: tournamentId }),
    client.rpc('admin_list_prediction_grace', { p_tournament_id: tournamentId }),
    client.rpc('admin_list_operation_events', { p_tournament_id: tournamentId, p_limit: 50 }),
    client.rpc('admin_list_team_profiles', { p_tournament_id: tournamentId }),
  ])
  throwForError('Admin match list failed', matchesResponse.error)
  throwForError('Admin scoring run list failed', runsResponse.error)
  throwForError('Admin control room failed', controlResponse.error)
  throwForError('Admin grace-window list failed', graceResponse.error)
  throwForError('Admin operation timeline failed', timelineResponse.error)
  throwForError('Admin team profile list failed', teamProfilesResponse.error)

  return Object.freeze({
    access,
    matches: Object.freeze(parseExternal(adminRecordRowsSchema, matchesResponse.data ?? [], 'Admin matches response').map(normaliseAdminMatch)),
    scoringRuns: normaliseScoringRuns(parseExternal(adminRecordRowsSchema, runsResponse.data ?? [], 'Admin scoring runs response')),
    controlRoom: normaliseAdminControlRoom(parseExternal(adminRecordSchema, controlResponse.data ?? {}, 'Admin control-room response')),
    graceWindows: normalisePredictionGrace(parseExternal(adminRecordRowsSchema, graceResponse.data ?? [], 'Admin grace response')),
    operationEvents: normaliseAdminOperationEvents(parseExternal(adminRecordRowsSchema, timelineResponse.data ?? [], 'Admin timeline response')),
    teamProfiles: normaliseAdminTeamProfiles(parseExternal(adminRecordRowsSchema, teamProfilesResponse.data ?? [], 'Admin team profiles response')),
  })
}

export async function loadAdminMatchHistory(client, tournamentId, matchId) {
  const response = await client.rpc('admin_get_match_result_history', {
    p_tournament_id: tournamentId,
    p_match_id: matchId,
  })
  throwForError('Admin result history failed', response.error)
  return normaliseAdminHistory(parseExternal(adminRecordRowsSchema, response.data ?? [], 'Admin result history response'))
}

export async function saveAdminMatchResult(client, tournamentId, match, draft) {
  const built = buildAdminResultPayload(match, draft)
  const response = await client.rpc('admin_record_match_result', {
    p_tournament_id: tournamentId,
    p_match_id: match.matchId,
    p_expected_result_revision: match.resultRevision,
    p_payload: built.payload,
    p_note: built.note,
  })
  throwForError('Admin result save failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Admin result save response')
}

export async function updateAdminMatchStatus(client, tournamentId, match, nextStatus, note) {
  const response = await client.rpc('admin_update_match_status', {
    p_tournament_id: tournamentId,
    p_match_id: match.matchId,
    p_expected_result_revision: match.resultRevision,
    p_match_status: nextStatus,
    p_note: note,
  })
  throwForError('Admin match status update failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Admin match status response')
}

export async function recalculateAdminMatchPoints(client, tournamentId, match, note) {
  const response = await client.rpc('admin_recalculate_match_points', {
    p_tournament_id: tournamentId,
    p_match_id: match.matchId,
    p_expected_result_revision: match.resultRevision,
    p_note: note,
  })
  throwForError('Admin points recalculation failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Admin recalculation response')
}

export async function applyGlobalPredictionLock(client, tournamentId, note) {
  const response = await client.rpc('admin_apply_global_prediction_lock', {
    p_tournament_id: tournamentId,
    p_note: note,
  })
  throwForError('Global prediction lock failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Global lock response')
}

export async function updateTournamentFeature(client, tournamentId, feature, isEnabled, note) {
  const response = await client.rpc('admin_update_feature_control', {
    p_tournament_id: tournamentId,
    p_feature_key: feature.featureKey,
    p_expected_revision: feature.revision,
    p_is_enabled: isEnabled,
    p_note: note,
  })
  throwForError('Feature control update failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Feature control response')
}

export async function searchAdminPredictionUsers(client, tournamentId, query) {
  const response = await client.rpc('admin_search_prediction_users', {
    p_tournament_id: tournamentId,
    p_query: query,
    p_limit: 20,
  })
  throwForError('Predictor search failed', response.error)
  return normaliseAdminUserSearch(parseExternal(adminRecordRowsSchema, response.data ?? [], 'Admin user search response'))
}

export async function grantAdminPredictionGrace(client, tournamentId, values) {
  const response = await client.rpc('admin_grant_prediction_grace', {
    p_tournament_id: tournamentId,
    p_user_id: values.userId,
    p_match_id: values.matchId,
    p_competition_key: values.competitionKey,
    p_expires_at: values.expiresAt,
    p_reason: values.reason,
  })
  throwForError('Prediction grace grant failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Prediction grace grant response')
}

export async function revokeAdminPredictionGrace(client, tournamentId, graceId, reason) {
  const response = await client.rpc('admin_revoke_prediction_grace', {
    p_tournament_id: tournamentId,
    p_grace_id: graceId,
    p_reason: reason,
  })
  throwForError('Prediction grace revocation failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Prediction grace revocation response')
}


export async function saveAdminTeamProfile(client, tournamentId, profile, validation) {
  const checked = validation ?? (() => { throw new Error('Team profile validation is required') })()
  const response = await client.rpc('admin_upsert_team_profile', {
    p_tournament_id: tournamentId,
    p_tournament_team_id: profile.tournamentTeamId,
    p_expected_revision: profile.profileRevision,
    p_payload: checked.payload,
    p_note: checked.note,
  })
  throwForError('Admin team profile save failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Admin team profile save response')
}
