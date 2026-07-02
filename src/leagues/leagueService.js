import {
  buildLeagueCompetitionSummary,
  buildSharedLeagueMemberList,
  compareSharedPredictionBundles,
  LEAGUE_COMPETITION,
  normaliseLeague,
  normaliseStanding,
} from './leagueModel.js'

function throwForError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

function settledSection(result, emptyValue) {
  if (result.status === 'fulfilled') {
    return Object.freeze({ status: 'ready', data: result.value, error: null })
  }
  return Object.freeze({
    status: 'error',
    data: emptyValue,
    error: result.reason instanceof Error ? result.reason.message : String(result.reason),
  })
}

export async function readLeagueSession(client) {
  const response = await client.auth.getSession()
  throwForError('Session read failed', response.error)
  return response.data?.session ?? null
}

export async function getMyLeagues(client, tournamentId) {
  const response = await client.rpc('get_my_leagues', { p_tournament_id: tournamentId })
  throwForError('League list failed', response.error)
  return Object.freeze((response.data ?? []).map(normaliseLeague))
}

export async function createLeague(client, { tournamentId, name }) {
  const response = await client.rpc('create_my_league', {
    p_tournament_id: tournamentId,
    p_name: name,
  })
  throwForError('League creation failed', response.error)
  return response.data
}

export async function joinLeague(client, { tournamentId, joinCode }) {
  const response = await client.rpc('join_league_by_code', {
    p_tournament_id: tournamentId,
    p_join_code: joinCode,
  })
  throwForError('League join failed', response.error)
  return response.data
}

export async function leaveLeague(client, leagueId) {
  const response = await client.rpc('leave_my_league', { p_league_id: leagueId })
  throwForError('Leaving league failed', response.error)
  return response.data
}

export async function deleteLeague(client, leagueId) {
  const response = await client.rpc('delete_my_league', { p_league_id: leagueId })
  throwForError('Deleting league failed', response.error)
  return response.data
}

export async function getLeagueStandings(client, { leagueId, competitionKey }) {
  const response = await client.rpc('get_league_standings', {
    p_league_id: leagueId,
    p_competition_key: competitionKey,
  })
  throwForError('League standings failed', response.error)
  return Object.freeze((response.data ?? []).map(normaliseStanding))
}

export async function loadLeagueOverview(client, leagueId) {
  const [originalResult, koResult] = await Promise.allSettled([
    getLeagueStandings(client, {
      leagueId,
      competitionKey: LEAGUE_COMPETITION.ORIGINAL,
    }),
    getLeagueStandings(client, {
      leagueId,
      competitionKey: LEAGUE_COMPETITION.KO_PREDICTOR,
    }),
  ])

  const original = settledSection(originalResult, Object.freeze([]))
  const koPredictor = settledSection(koResult, Object.freeze([]))
  const readySections = [original, koPredictor].filter(section => section.status === 'ready').length

  return Object.freeze({
    status: readySections === 2 ? 'ready' : readySections === 1 ? 'partial' : 'error',
    sections: Object.freeze({ original, koPredictor }),
    summaries: Object.freeze({
      original: buildLeagueCompetitionSummary(original.data, LEAGUE_COMPETITION.ORIGINAL),
      koPredictor: buildLeagueCompetitionSummary(koPredictor.data, LEAGUE_COMPETITION.KO_PREDICTOR),
    }),
    members: buildSharedLeagueMemberList(original.data, koPredictor.data),
  })
}

export async function getLeagueMemberPredictions(client, {
  leagueId,
  memberUserId,
  competitionKey,
}) {
  const response = await client.rpc('get_league_member_predictions', {
    p_league_id: leagueId,
    p_member_user_id: memberUserId,
    p_competition_key: competitionKey,
  })
  throwForError('Shared prediction read failed', response.error)
  return response.data
}

export async function loadLeagueHeadToHead(client, {
  leagueId,
  currentUserId,
  otherUserId,
  competitionKey,
}) {
  const [currentBundle, otherBundle] = await Promise.all([
    getLeagueMemberPredictions(client, {
      leagueId,
      memberUserId: currentUserId,
      competitionKey,
    }),
    getLeagueMemberPredictions(client, {
      leagueId,
      memberUserId: otherUserId,
      competitionKey,
    }),
  ])

  return Object.freeze({
    currentBundle,
    otherBundle,
    comparison: compareSharedPredictionBundles(currentBundle, otherBundle, competitionKey),
  })
}
