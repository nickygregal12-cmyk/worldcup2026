import { EURO28_KO_PREDICTOR_RPC, KO_PREDICTOR_COMPETITION_KEY } from './koPredictorConfig.js'

export async function loadMyKoPredictionBundle(client, tournamentId, userId) {
  if (!client || !tournamentId || !userId) return null
  const setResult = await client
    .from('prediction_sets')
    .select('id,tournament_id,competition_key,revision,created_at,updated_at')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .eq('competition_key', KO_PREDICTOR_COMPETITION_KEY)
    .maybeSingle()
  if (setResult.error) throw setResult.error
  if (!setResult.data) return null
  const rowsResult = await client
    .from('match_predictions')
    .select('match_id,predicted_home_tournament_team_id,predicted_away_tournament_team_id,home_score_90,away_score_90,advancing_tournament_team_id,decision_method,joker_applied,updated_at')
    .eq('prediction_set_id', setResult.data.id)
  if (rowsResult.error) throw rowsResult.error
  return { revision: Number(setResult.data.revision), predictions: rowsResult.data ?? [] }
}

export async function loadMyKoPredictorStanding(client, tournamentId, userId) {
  if (!client || !tournamentId || !userId) return Object.freeze({ points: 0, rank: null })
  const [pointsResponse, leaderboardResponse] = await Promise.all([
    client.rpc('get_my_competition_points', {
      p_tournament_id: tournamentId,
      p_competition_key: KO_PREDICTOR_COMPETITION_KEY,
    }),
    client.rpc('get_competition_leaderboard', {
      p_tournament_id: tournamentId,
      p_competition_key: KO_PREDICTOR_COMPETITION_KEY,
    }),
  ])
  if (pointsResponse.error) throw pointsResponse.error
  if (leaderboardResponse.error) throw leaderboardResponse.error
  const rankRow = (leaderboardResponse.data ?? []).find(row => row.user_id === userId)
  return Object.freeze({
    points: Number(pointsResponse.data?.total_points ?? 0),
    rank: rankRow ? Number(rankRow.rank) : null,
  })
}

export async function saveMyKoPredictionBundle(client, { tournamentId, expectedRevision, predictions }) {
  const { data, error } = await client.rpc(EURO28_KO_PREDICTOR_RPC, {
    p_tournament_id: tournamentId,
    p_expected_revision: expectedRevision,
    p_predictions: predictions,
  })
  if (error) throw error
  const result = Array.isArray(data) ? data[0] : data
  return {
    predictionSetId: result.prediction_set_id,
    competitionKey: result.competition_key,
    revision: Number(result.revision),
    savedPredictionCount: Number(result.saved_prediction_count),
    jokerCount: Number(result.joker_count),
  }
}
