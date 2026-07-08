import { parseExternal } from '../contracts/externalValidation.js'
import { leaderboardRowsSchema, sharedPredictionBundleSchema } from '../contracts/externalSchemas.js'
import { normaliseLeaderboard } from '../results/resultModel.js'
import { LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
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

export async function loadPlayerView(client, {
  reference,
  memberUserId,
  competitionKey = LEAGUE_COMPETITION.ORIGINAL,
  lifecycle = null,
}) {
  if (!client) throw new Error('Euro 2028 data could not be loaded right now.')
  if (!reference?.tournamentId) throw new Error('The Euro tournament reference is unavailable.')

  const currentSession = await session(client)
  const userId = memberUserId || currentSession?.user?.id || null
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

  const [standingsRows, predictionBundle] = await Promise.all([
    overallStandings(client, reference.tournamentId, safeCompetitionKey),
    sharedBundle(client, reference.tournamentId, userId, safeCompetitionKey),
  ])

  return Object.freeze({
    signedIn: true,
    currentUserId: currentSession?.user?.id ?? null,
    memberUserId: userId,
    competitionKey: safeCompetitionKey,
    standingsRows,
    view: buildPlayerView({
      memberUserId: userId,
      displayName: predictionBundle.displayName,
      standingsRows,
      predictionBundle,
      competitionKey: safeCompetitionKey,
      reference,
      lifecycle,
    }),
  })
}
