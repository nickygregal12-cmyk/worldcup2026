import {
  buildLeagueCompetitionSummary,
  canCreateKoLeague,
  compareSharedPredictionBundles,
  LEAGUE_COMPETITION,
  normaliseLeague,
  normaliseStanding,
  validateLeagueCompetition,
} from './leagueModel.js'
import { parseExternal } from '../contracts/externalValidation.js'
import { loadPlayerInsightPair } from '../player/playerInsightService.js'
import { leagueRowsSchema, leagueStandingRowsSchema, mutationResultSchema, sharedPredictionBundleSchema } from '../contracts/externalSchemas.js'

function throwForError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

export async function readLeagueSession(client) {
  const response = await client.auth.getSession()
  throwForError('Session read failed', response.error)
  return response.data?.session ?? null
}

export async function getMyLeagues(client, tournamentId) {
  const response = await client.rpc('get_my_leagues', { p_tournament_id: tournamentId })
  throwForError('League list failed', response.error)
  const rows = parseExternal(leagueRowsSchema, response.data ?? [], 'League list response')
  return Object.freeze(rows.map(normaliseLeague))
}

export async function createLeague(client, { tournamentId, name, competition, koReadiness = null }) {
  const competitionCheck = validateLeagueCompetition(competition)
  if (!competitionCheck.valid) throw new Error(competitionCheck.error)

  // The database is the real gate (create_my_league rejects this server-side regardless). This is
  // early validation and defense in depth, so it only fires when koReadiness is actually supplied --
  // callers that don't have it yet still get a correct, authoritative answer from the RPC itself.
  if (competitionCheck.value === LEAGUE_COMPETITION.KO_PREDICTOR && koReadiness && !canCreateKoLeague(koReadiness)) {
    throw new Error('KO Predictor leagues cannot be created until a real knockout fixture is known.')
  }

  const response = await client.rpc('create_my_league', {
    p_tournament_id: tournamentId,
    p_name: name,
    p_competition: competitionCheck.value,
  })
  throwForError('League creation failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'League creation response')
}

export async function joinLeague(client, { tournamentId, joinCode }) {
  const response = await client.rpc('join_league_by_code', {
    p_tournament_id: tournamentId,
    p_join_code: joinCode,
  })
  throwForError('League join failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'League join response')
}

export async function leaveLeague(client, leagueId) {
  const response = await client.rpc('leave_my_league', { p_league_id: leagueId })
  throwForError('Leaving league failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Leave league response')
}

export async function deleteLeague(client, leagueId) {
  const response = await client.rpc('delete_my_league', { p_league_id: leagueId })
  throwForError('Deleting league failed', response.error)
  return parseExternal(mutationResultSchema, response.data ?? null, 'Delete league response')
}

export async function getLeagueStandings(client, { leagueId, competitionKey }) {
  const response = await client.rpc('get_league_standings', {
    p_league_id: leagueId,
    p_competition_key: competitionKey,
  })
  throwForError('League standings failed', response.error)
  const rows = parseExternal(leagueStandingRowsSchema, response.data ?? [], 'League standings response')
  return Object.freeze(rows.map(normaliseStanding))
}

export async function loadLeagueOverview(client, { leagueId, competitionKey }) {
  const competitionCheck = validateLeagueCompetition(competitionKey)
  if (!competitionCheck.valid) throw new Error(competitionCheck.error)

  const standings = await getLeagueStandings(client, {
    leagueId,
    competitionKey: competitionCheck.value,
  })

  return Object.freeze({
    status: 'ready',
    competitionKey: competitionCheck.value,
    standings,
    summary: buildLeagueCompetitionSummary(standings, competitionCheck.value, {
      leagueCompetition: competitionCheck.value,
    }),
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
  return parseExternal(sharedPredictionBundleSchema, response.data ?? {}, 'League member prediction response')
}

export async function loadLeagueHeadToHead(client, {
  leagueId,
  currentUserId,
  otherUserId,
  competitionKey,
  tournamentId,
  reference,
}) {
  const [currentBundle, otherBundle, insights] = await Promise.all([
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
    loadPlayerInsightPair(client, {
      tournamentId,
      currentUserId,
      otherUserId,
      competitionKey,
      reference,
    }),
  ])

  return Object.freeze({
    currentBundle,
    otherBundle,
    insights,
    comparison: compareSharedPredictionBundles(currentBundle, otherBundle, competitionKey),
  })
}
