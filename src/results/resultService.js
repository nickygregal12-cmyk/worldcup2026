import {
  buildLiveTournamentSnapshot,
  normaliseLeaderboard,
  normalisePointsBreakdown,
  RESULT_COMPETITION,
} from './resultModel.js'
import { compareSharedPredictionBundles } from '../leagues/leagueModel.js'

const RESULT_COLUMNS = [
  'id',
  'match_number',
  'status',
  'result_status',
  'result_revision',
  'home_score_90',
  'away_score_90',
  'home_score_aet',
  'away_score_aet',
  'home_penalties',
  'away_penalties',
  'result_method',
  'winner_tournament_team_id',
].join(',')

function throwForError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

function messageFor(reason) {
  return reason instanceof Error ? reason.message : String(reason)
}

function readySection(data) {
  return Object.freeze({ status: 'ready', data, error: null })
}

function errorSection(reason, fallback) {
  return Object.freeze({ status: 'error', data: fallback, error: messageFor(reason) })
}

function skippedSection(data = null) {
  return Object.freeze({ status: 'skipped', data, error: null })
}

export async function loadCanonicalTournamentSnapshot(client, reference) {
  const response = await client
    .from('matches')
    .select(RESULT_COLUMNS)
    .eq('tournament_id', reference.tournamentId)
    .order('match_number')
  throwForError('Canonical result read failed', response.error)
  return buildLiveTournamentSnapshot({
    reference,
    resultRows: response.data ?? [],
  })
}

async function readSession(client) {
  const response = await client.auth.getSession()
  throwForError('Session read failed', response.error)
  return response.data?.session ?? null
}

async function readLeaderboard(client, tournamentId, competitionKey) {
  const response = await client.rpc('get_competition_leaderboard', {
    p_tournament_id: tournamentId,
    p_competition_key: competitionKey,
  })
  throwForError(`${competitionKey} leaderboard read failed`, response.error)
  return normaliseLeaderboard(response.data ?? [], competitionKey)
}

async function readMyPoints(client, tournamentId, competitionKey, reference) {
  const response = await client.rpc('get_my_competition_points', {
    p_tournament_id: tournamentId,
    p_competition_key: competitionKey,
  })
  throwForError(`${competitionKey} points read failed`, response.error)
  return normalisePointsBreakdown(response.data ?? null, competitionKey, reference)
}

async function readSharedPredictionBundle(client, tournamentId, memberUserId, competitionKey) {
  const response = await client.rpc('get_member_predictions_after_lock', {
    p_tournament_id: tournamentId,
    p_member_user_id: memberUserId,
    p_competition_key: competitionKey,
  })
  throwForError(`${competitionKey} shared prediction read failed`, response.error)
  return response.data
}

export async function loadOverallHeadToHead(client, {
  tournamentId,
  currentUserId,
  otherUserId,
  competitionKey,
}) {
  const [currentBundle, otherBundle] = await Promise.all([
    readSharedPredictionBundle(client, tournamentId, currentUserId, competitionKey),
    readSharedPredictionBundle(client, tournamentId, otherUserId, competitionKey),
  ])

  return Object.freeze({
    currentBundle,
    otherBundle,
    comparison: compareSharedPredictionBundles(currentBundle, otherBundle, competitionKey),
  })
}

export async function loadResultsAndLeaderboards(client, reference) {
  if (!client) throw new Error('The Euro staging database client is unavailable.')
  if (!reference?.tournamentId) throw new Error('The Euro tournament reference is unavailable.')

  const [liveResult, sessionResult] = await Promise.allSettled([
    loadCanonicalTournamentSnapshot(client, reference),
    readSession(client),
  ])

  const liveSection = liveResult.status === 'fulfilled'
    ? readySection(liveResult.value)
    : errorSection(liveResult.reason, null)
  const sessionSection = sessionResult.status === 'fulfilled'
    ? readySection(sessionResult.value)
    : errorSection(sessionResult.reason, null)
  const session = sessionSection.data
  const signedIn = Boolean(session?.user)

  let originalLeaderboard = skippedSection(Object.freeze([]))
  let koLeaderboard = skippedSection(Object.freeze([]))
  let originalPoints = skippedSection(normalisePointsBreakdown(null, RESULT_COMPETITION.ORIGINAL, reference))
  let koPoints = skippedSection(normalisePointsBreakdown(null, RESULT_COMPETITION.KO_PREDICTOR, reference))

  if (signedIn) {
    const settled = await Promise.allSettled([
      readLeaderboard(client, reference.tournamentId, RESULT_COMPETITION.ORIGINAL),
      readLeaderboard(client, reference.tournamentId, RESULT_COMPETITION.KO_PREDICTOR),
      readMyPoints(client, reference.tournamentId, RESULT_COMPETITION.ORIGINAL, reference),
      readMyPoints(client, reference.tournamentId, RESULT_COMPETITION.KO_PREDICTOR, reference),
    ])

    originalLeaderboard = settled[0].status === 'fulfilled'
      ? readySection(settled[0].value)
      : errorSection(settled[0].reason, Object.freeze([]))
    koLeaderboard = settled[1].status === 'fulfilled'
      ? readySection(settled[1].value)
      : errorSection(settled[1].reason, Object.freeze([]))
    originalPoints = settled[2].status === 'fulfilled'
      ? readySection(settled[2].value)
      : errorSection(settled[2].reason, normalisePointsBreakdown(null, RESULT_COMPETITION.ORIGINAL, reference))
    koPoints = settled[3].status === 'fulfilled'
      ? readySection(settled[3].value)
      : errorSection(settled[3].reason, normalisePointsBreakdown(null, RESULT_COMPETITION.KO_PREDICTOR, reference))
  }

  const sections = Object.freeze({
    live: liveSection,
    session: sessionSection,
    originalLeaderboard,
    koLeaderboard,
    originalPoints,
    koPoints,
  })
  const requested = signedIn
    ? Object.values(sections)
    : [liveSection, sessionSection]
  const errorCount = requested.filter(section => section.status === 'error').length
  const readyCount = requested.filter(section => section.status === 'ready').length
  const status = errorCount === 0 ? 'ready' : readyCount > 0 ? 'partial' : 'error'

  return Object.freeze({
    status,
    signedIn,
    currentUserId: session?.user?.id ?? null,
    live: liveSection.data,
    leaderboards: Object.freeze({
      original: originalLeaderboard.data,
      koPredictor: koLeaderboard.data,
    }),
    myPoints: Object.freeze({
      original: originalPoints.data,
      koPredictor: koPoints.data,
    }),
    sections,
  })
}
