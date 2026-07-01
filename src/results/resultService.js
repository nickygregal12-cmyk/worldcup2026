import {
  buildLiveTournamentSnapshot,
  normaliseLeaderboard,
  RESULT_COMPETITION,
} from './resultModel.js'

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

async function readLeaderboard(client, tournamentId, competitionKey) {
  const response = await client.rpc('get_competition_leaderboard', {
    p_tournament_id: tournamentId,
    p_competition_key: competitionKey,
  })
  throwForError(`${competitionKey} leaderboard read failed`, response.error)
  return normaliseLeaderboard(response.data ?? [], competitionKey)
}

async function readMyPoints(client, tournamentId, competitionKey) {
  const response = await client.rpc('get_my_competition_points', {
    p_tournament_id: tournamentId,
    p_competition_key: competitionKey,
  })
  throwForError(`${competitionKey} points read failed`, response.error)
  return response.data ?? null
}

export async function loadResultsAndLeaderboards(client, reference) {
  if (!client) throw new Error('The Euro staging database client is unavailable.')
  if (!reference?.tournamentId) throw new Error('The Euro tournament reference is unavailable.')

  const resultsResponse = await client
    .from('matches')
    .select(RESULT_COLUMNS)
    .eq('tournament_id', reference.tournamentId)
    .order('match_number')
  throwForError('Canonical result read failed', resultsResponse.error)

  const live = buildLiveTournamentSnapshot({
    reference,
    resultRows: resultsResponse.data ?? [],
  })

  const sessionResponse = await client.auth.getSession()
  throwForError('Session read failed', sessionResponse.error)
  const signedIn = Boolean(sessionResponse.data?.session?.user)

  if (!signedIn) {
    return Object.freeze({
      live,
      signedIn: false,
      leaderboards: Object.freeze({ original: [], koPredictor: [] }),
      myPoints: Object.freeze({ original: null, koPredictor: null }),
    })
  }

  const [originalLeaderboard, koLeaderboard, originalPoints, koPoints] = await Promise.all([
    readLeaderboard(client, reference.tournamentId, RESULT_COMPETITION.ORIGINAL),
    readLeaderboard(client, reference.tournamentId, RESULT_COMPETITION.KO_PREDICTOR),
    readMyPoints(client, reference.tournamentId, RESULT_COMPETITION.ORIGINAL),
    readMyPoints(client, reference.tournamentId, RESULT_COMPETITION.KO_PREDICTOR),
  ])

  return Object.freeze({
    live,
    signedIn: true,
    leaderboards: Object.freeze({
      original: originalLeaderboard,
      koPredictor: koLeaderboard,
    }),
    myPoints: Object.freeze({
      original: originalPoints,
      koPredictor: koPoints,
    }),
  })
}
