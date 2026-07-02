import { buildCompleteGuestImportRows, buildPredictionSaveRequest } from './predictionSaveBundle.js'
import { EURO28_PREDICTION_SAVE_RPC, PREDICTION_SAVE_SOURCE } from './predictionSaveConfig.js'
import { parseExternal } from '../contracts/externalValidation.js'
import { bracketPredictionRowsSchema, matchPredictionRowsSchema, predictionSaveResultSchema, predictionSetRowSchema } from '../contracts/externalSchemas.js'

function requireClient(client) {
  if (!client) throw new Error('The Euro prediction client is unavailable.')
}

function normaliseSaveResult(data) {
  const candidate = Array.isArray(data) ? data[0] : data
  const result = parseExternal(predictionSaveResultSchema, candidate, 'Original prediction save response')
  if (!Number.isInteger(Number(result.revision))) throw new Error('The atomic original-predictor save result was not returned.')
  return {
    predictionSetId: result.prediction_set_id,
    tournamentId: result.tournament_id,
    competitionKey: result.competition_key ?? 'original',
    revision: Number(result.revision),
    submittedAt: result.submitted_at ?? null,
    guestImportedAt: result.guest_imported_at ?? null,
    lastSaveSource: result.last_save_source,
    savedPredictionCount: Number(result.saved_prediction_count),
    savedGroupCount: Number(result.saved_group_count ?? 0),
    savedBracketCount: Number(result.saved_bracket_count ?? 0),
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
    .select('id,tournament_id,user_id,competition_key,revision,submitted_at,guest_imported_at,last_save_source,created_at,updated_at')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .eq('competition_key', 'original')
    .maybeSingle()
  if (setResult.error) throw setResult.error
  if (!setResult.data) return null
  const predictionSet = parseExternal(predictionSetRowSchema, setResult.data, 'Original prediction set response')

  const [groupResult, bracketResult] = await Promise.all([
    client
      .from('match_predictions')
      .select('match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,home_score_90,away_score_90,joker_applied,updated_at')
      .eq('prediction_set_id', predictionSet.id),
    client
      .from('bracket_predictions')
      .select('match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,advancing_tournament_team_id,updated_at')
      .eq('prediction_set_id', predictionSet.id),
  ])
  if (groupResult.error) throw groupResult.error
  if (bracketResult.error) throw bracketResult.error

  const groupRows = parseExternal(matchPredictionRowsSchema, groupResult.data ?? [], 'Original match prediction response').map(row => ({
    ...row,
    prediction_kind: 'group_score',
    advancing_tournament_team_id: null,
    decision_method: null,
  }))
  const bracketRows = parseExternal(bracketPredictionRowsSchema, bracketResult.data ?? [], 'Original bracket prediction response').map(row => ({
    ...row,
    prediction_kind: 'bracket_pick',
    home_score_90: null,
    away_score_90: null,
    decision_method: null,
    joker_applied: false,
  }))

  return {
    predictionSetId: predictionSet.id,
    tournamentId: predictionSet.tournament_id,
    competitionKey: predictionSet.competition_key,
    revision: Number(predictionSet.revision),
    submittedAt: predictionSet.submitted_at,
    guestImportedAt: predictionSet.guest_imported_at,
    lastSaveSource: predictionSet.last_save_source,
    createdAt: predictionSet.created_at,
    updatedAt: predictionSet.updated_at,
    predictions: [...groupRows, ...bracketRows],
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
