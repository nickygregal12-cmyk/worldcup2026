import { parseExternal } from '../contracts/externalValidation.js'
import { leaderboardRowsSchema, sharedPredictionBundleSchema } from '../contracts/externalSchemas.js'
import { normaliseLeaderboard } from '../results/resultModel.js'
import { LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { loadMyPredictionBundle } from '../predictions/predictionSaveService.js'
import { loadMyKoPredictionBundle } from '../koPredictor/koPredictorService.js'
import { buildPlayerView } from './playerViewModel.js'

function throwForError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

async function session(client) {
  const response = await client.auth.getSession()
  throwForError('Session read failed', response.error)
  return response.data?.session ?? null
}

async function overallStandings(client, tournamentId, competitionKey) {
  const response = await client.rpc('get_competition_leaderboard', {
    p_tournament_id: tournamentId,
    p_competition_key: competitionKey,
  })
  throwForError('Player standings read failed', response.error)
  return normaliseLeaderboard(
    parseExternal(leaderboardRowsSchema, response.data ?? [], 'Player standings response'),
    competitionKey,
  )
}

async function sharedBundle(client, tournamentId, memberUserId, competitionKey) {
  const response = await client.rpc('get_member_predictions_after_lock', {
    p_tournament_id: tournamentId,
    p_member_user_id: memberUserId,
    p_competition_key: competitionKey,
  })
  throwForError('Player prediction read failed', response.error)
  return parseExternal(sharedPredictionBundleSchema, response.data ?? {}, 'Player prediction response')
}

// The shared-prediction bundle is keyed by match number; the owner-facing reads return match ids.
function matchNumbersById(reference) {
  const pairs = [...(reference.groupMatches ?? []), ...(reference.knockoutMatches ?? [])]
    .map(match => [match.matchId, match.matchNumber])
  return new Map(pairs)
}

async function ownDisplayName(client, userId) {
  const response = await client.from('profiles').select('display_name').eq('id', userId).maybeSingle()
  if (response.error) return 'You'
  return response.data?.display_name ?? 'You'
}

// `get_member_predictions_after_lock` withholds unreleased picks from everyone, including their
// owner. Reading your own rows straight from the prediction tables (owner-readable under RLS at
// any time, exactly as the Groups, Bracket and KO Predictor pages already do) lets your own
// player view show your real picks before the lock without loosening anyone else's privacy.
async function ownBundle(client, { reference, userId, competitionKey }) {
  const numbersById = matchNumbersById(reference)
  const withMatchNumber = row => {
    const number = Number(row.match_number ?? numbersById.get(row.match_id) ?? 0)
    return number > 0 ? { ...row, match_number: number } : null
  }

  const isKoPredictor = competitionKey === LEAGUE_COMPETITION.KO_PREDICTOR
  const [displayName, own] = await Promise.all([
    ownDisplayName(client, userId),
    isKoPredictor
      ? loadMyKoPredictionBundle(client, reference.tournamentId, userId)
      : loadMyPredictionBundle(client, reference.tournamentId, userId),
  ])

  const rows = own?.predictions ?? []
  const matchRows = (isKoPredictor ? rows : rows.filter(row => row.prediction_kind !== 'bracket_pick'))
    .map(withMatchNumber).filter(Boolean)
  const bracketRows = (isKoPredictor ? [] : rows.filter(row => row.prediction_kind === 'bracket_pick'))
    .map(withMatchNumber).filter(Boolean)

  return parseExternal(sharedPredictionBundleSchema, {
    visible: true,
    display_name: displayName,
    reason: null,
    match_predictions: matchRows,
    bracket_predictions: bracketRows,
  }, 'Own prediction response')
}

export async function loadPlayerView(client, {
  reference,
  memberUserId,
  competitionKey = LEAGUE_COMPETITION.ORIGINAL,
  lifecycle = null,
}) {
  if (!client) throw new Error('Euro 2028 data could not be loaded right now.')
  if (!reference?.tournamentId) throw new Error('The Euro tournament reference is unavailable.')

  const currentSession = await session(client)
  const currentUserId = currentSession?.user?.id ?? null
  const userId = memberUserId || currentUserId || null
  if (!userId) {
    return Object.freeze({
      signedIn: false,
      view: null,
      competitionKey,
    })
  }

  const safeCompetitionKey = competitionKey === LEAGUE_COMPETITION.KO_PREDICTOR
    ? LEAGUE_COMPETITION.KO_PREDICTOR
    : LEAGUE_COMPETITION.ORIGINAL

  const isSelf = Boolean(currentUserId) && userId === currentUserId

  const [standingsRows, predictionBundle] = await Promise.all([
    overallStandings(client, reference.tournamentId, safeCompetitionKey),
    isSelf
      ? ownBundle(client, { reference, userId, competitionKey: safeCompetitionKey })
      : sharedBundle(client, reference.tournamentId, userId, safeCompetitionKey),
  ])

  return Object.freeze({
    signedIn: true,
    currentUserId,
    memberUserId: userId,
    isSelf,
    competitionKey: safeCompetitionKey,
    standingsRows,
    view: buildPlayerView({
      memberUserId: userId,
      displayName: predictionBundle.display_name,
      standingsRows,
      predictionBundle,
      competitionKey: safeCompetitionKey,
      reference,
      lifecycle,
      isSelf,
    }),
  })
}
