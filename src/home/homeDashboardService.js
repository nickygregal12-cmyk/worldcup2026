import { createGuestPredictionState, createGuestPredictionStorage } from '../guest/index.js'
import { summarisePredictionJourney } from '../journey/predictionJourneyModel.js'
import { loadMyKoPredictionBundle } from '../koPredictor/koPredictorService.js'
import { getMyLeagues } from '../leagues/leagueService.js'
import { loadMyPredictionBundle } from '../predictions/predictionSaveService.js'
import { loadResultsAndLeaderboards } from '../results/resultService.js'
import { buildHomeDashboard } from './homeDashboardModel.js'

function errorMessage(reason) {
  return reason instanceof Error ? reason.message : String(reason)
}

function settledValue(result, key, errors) {
  if (result.status === 'fulfilled') return result.value
  errors[key] = errorMessage(result.reason)
  return null
}

export function readGuestDashboardSummary(reference, storage = globalThis.localStorage) {
  const guestStorage = createGuestPredictionStorage({ storage, reference })
  const loaded = guestStorage.load()
  const state = loaded.status === 'ready' ? loaded.state : createGuestPredictionState(reference)
  return {
    summary: summarisePredictionJourney(reference, state),
    storageStatus: loaded.status,
    storageError: loaded.error,
  }
}

export async function loadHomeDashboard({ client, tournament, reference, session, profile, scoring = null }) {
  if (!client) throw new Error('The Euro dashboard client is unavailable.')
  const signedIn = Boolean(session?.user?.id)
  const guest = readGuestDashboardSummary(reference)
  const tasks = [loadResultsAndLeaderboards(client, reference)]

  if (signedIn) {
    tasks.push(
      loadMyPredictionBundle(client, reference.tournamentId, session.user.id),
      loadMyKoPredictionBundle(client, reference.tournamentId, session.user.id),
      getMyLeagues(client, reference.tournamentId),
    )
  }

  const settled = await Promise.allSettled(tasks)
  const errors = {}
  const results = settledValue(settled[0], 'results', errors)
  const originalBundle = signedIn ? settledValue(settled[1], 'original', errors) : null
  const koBundle = signedIn ? settledValue(settled[2], 'koPredictor', errors) : null
  const leagues = signedIn ? settledValue(settled[3], 'leagues', errors) : []

  if (guest.storageStatus === 'invalid' || guest.storageStatus === 'unavailable') {
    errors.guest = guest.storageError || 'Browser prediction storage is unavailable.'
  }

  return buildHomeDashboard({
    tournament,
    reference,
    session,
    profile,
    guestSummary: guest.summary,
    originalBundle,
    koBundle,
    results,
    leagues,
    sectionErrors: errors,
    scoring,
  })
}
