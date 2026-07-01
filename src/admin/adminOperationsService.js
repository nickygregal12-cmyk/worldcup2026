import {
  buildAdminResultPayload,
  normaliseAdminAccess,
  normaliseAdminHistory,
  normaliseAdminMatch,
  normaliseScoringRuns,
} from './adminOperationsModel.js'

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
  return normaliseAdminAccess(response.data)
}

export async function loadAdminOperations(client, tournamentId) {
  const access = await loadAdminAccess(client, tournamentId)
  if (!access.isAdmin) {
    return Object.freeze({ access, matches: [], scoringRuns: [] })
  }

  const [matchesResponse, runsResponse] = await Promise.all([
    client.rpc('admin_list_tournament_matches', { p_tournament_id: tournamentId }),
    client.rpc('admin_list_scoring_runs', { p_tournament_id: tournamentId, p_limit: 25 }),
  ])
  throwForError('Admin match list failed', matchesResponse.error)
  throwForError('Admin scoring run list failed', runsResponse.error)

  return Object.freeze({
    access,
    matches: Object.freeze((matchesResponse.data ?? []).map(normaliseAdminMatch)),
    scoringRuns: normaliseScoringRuns(runsResponse.data ?? []),
  })
}

export async function loadAdminMatchHistory(client, tournamentId, matchId) {
  const response = await client.rpc('admin_get_match_result_history', {
    p_tournament_id: tournamentId,
    p_match_id: matchId,
  })
  throwForError('Admin result history failed', response.error)
  return normaliseAdminHistory(response.data ?? [])
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
  return response.data
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
  return response.data
}

export async function recalculateAdminMatchPoints(client, tournamentId, match, note) {
  const response = await client.rpc('admin_recalculate_match_points', {
    p_tournament_id: tournamentId,
    p_match_id: match.matchId,
    p_expected_result_revision: match.resultRevision,
    p_note: note,
  })
  throwForError('Admin points recalculation failed', response.error)
  return response.data
}
