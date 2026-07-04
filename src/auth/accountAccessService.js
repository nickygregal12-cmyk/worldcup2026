import { getMyLeagues } from '../leagues/leagueService.js'
import { loadMyPredictionBundle, saveMyPredictionBundle } from '../predictions/predictionSaveService.js'
import { PREDICTION_SAVE_SOURCE } from '../predictions/predictionSaveConfig.js'
import { buildAccountStats } from './accountAccessModel.js'

function requireClient(client) {
  if (!client) throw new Error('The Euro account client is unavailable.')
}

export async function loadAccountDashboard(client, { tournamentId, userId }) {
  requireClient(client)
  if (!tournamentId) throw new TypeError('tournamentId is required')
  if (!userId) throw new TypeError('userId is required')

  const [leagueResult, bundleResult] = await Promise.allSettled([
    getMyLeagues(client, tournamentId),
    loadMyPredictionBundle(client, tournamentId, userId),
  ])

  const leagues = leagueResult.status === 'fulfilled' ? leagueResult.value : []
  const predictionBundle = bundleResult.status === 'fulfilled' ? bundleResult.value : null
  const errors = [leagueResult, bundleResult]
    .filter(result => result.status === 'rejected')
    .map(result => result.reason instanceof Error ? result.reason.message : String(result.reason))

  return Object.freeze({
    stats: buildAccountStats({ leagues, predictionBundle }),
    predictionBundle,
    errors,
  })
}

export async function clearMyOriginalPredictions(client, { tournamentId, currentRevision = 0 }) {
  requireClient(client)
  if (!tournamentId) throw new TypeError('tournamentId is required')

  return saveMyPredictionBundle(client, {
    tournamentId,
    expectedRevision: Number.isInteger(Number(currentRevision)) ? Number(currentRevision) : 0,
    submitted: false,
    predictions: [],
    source: PREDICTION_SAVE_SOURCE.ACCOUNT,
  })
}
