import { buildCompleteGuestImportRows, buildPredictionSaveRequest } from './predictionSaveBundle.js'
import { EURO28_PREDICTION_SAVE_RPC, PREDICTION_SAVE_SOURCE } from './predictionSaveConfig.js'

function requireClient(client) {
  if (!client) throw new Error('The Euro prediction client is unavailable.')
}

function normaliseSaveResult(data) {
  const result = Array.isArray(data) ? data[0] : data
  if (!result || !Number.isInteger(Number(result.revision))) {
    throw new Error('The atomic prediction save result was not returned.')
  }
  return {
    predictionSetId: result.prediction_set_id,
    tournamentId: result.tournament_id,
    revision: Number(result.revision),
    submittedAt: result.submitted_at ?? null,
    guestImportedAt: result.guest_imported_at ?? null,
    lastSaveSource: result.last_save_source,
    savedPredictionCount: Number(result.saved_prediction_count),
  }
}

export async function saveMyPredictionBundle(client, input) {
  requireClient(client)
  const request = buildPredictionSaveRequest(input)
  const { data, error } = await client.rpc(EURO28_PREDICTION_SAVE_RPC, request)
  if (error) throw error
  return normaliseSaveResult(data)
}

export async function loadMyPredictionBundle(client, tournamentId, userId) {
  requireClient(client)
  if (!tournamentId) throw new TypeError('tournamentId is required')
  if (!userId) throw new TypeError('userId is required')

  const setResult = await client
    .from('prediction_sets')
    .select('id,tournament_id,user_id,revision,submitted_at,guest_imported_at,last_save_source,created_at,updated_at')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .maybeSingle()
  if (setResult.error) throw setResult.error
  if (!setResult.data) return null

  const rowsResult = await client
    .from('match_predictions')
    .select('match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,home_score_90,away_score_90,advancing_tournament_team_id,decision_method,joker_applied,updated_at')
    .eq('prediction_set_id', setResult.data.id)
  if (rowsResult.error) throw rowsResult.error

  return {
    predictionSetId: setResult.data.id,
    tournamentId: setResult.data.tournament_id,
    revision: Number(setResult.data.revision),
    submittedAt: setResult.data.submitted_at,
    guestImportedAt: setResult.data.guest_imported_at,
    lastSaveSource: setResult.data.last_save_source,
    createdAt: setResult.data.created_at,
    updatedAt: setResult.data.updated_at,
    predictions: rowsResult.data ?? [],
  }
}

export async function importGuestDraftToAccount(client, { reference, state, expectedRevision = 0 }) {
  const predictions = buildCompleteGuestImportRows(reference, state)
  return saveMyPredictionBundle(client, {
    tournamentId: reference.tournamentId,
    expectedRevision,
    submitted: false,
    predictions,
    source: PREDICTION_SAVE_SOURCE.GUEST_IMPORT,
  })
}
