import { getLeagueMemberPredictions, getLeagueStandings, getMyLeagues } from '../leagues/leagueService.js'
import { normaliseLeaderboard, RESULT_COMPETITION } from '../results/resultModel.js'
import { loadCanonicalTournamentSnapshot } from '../results/resultService.js'
import { parseExternal } from '../contracts/externalValidation.js'
import { leaderboardRowsSchema, sharedPredictionBundleSchema } from '../contracts/externalSchemas.js'
import { buildFixtureImpact, buildGroupMatchCentreContext, buildMatchCentreNavigation, defaultMatchNumber } from './matchCentreModel.js'

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
  throwForError('Overall standings read failed', response.error)
  return normaliseLeaderboard(parseExternal(leaderboardRowsSchema, response.data ?? [], 'Overall standings response'), competitionKey)
}

async function overallBundle(client, tournamentId, memberUserId, competitionKey) {
  const response = await client.rpc('get_member_predictions_after_lock', {
    p_tournament_id: tournamentId,
    p_member_user_id: memberUserId,
    p_competition_key: competitionKey,
  })
  throwForError('Overall shared prediction read failed', response.error)
  return parseExternal(sharedPredictionBundleSchema, response.data ?? {}, 'Overall shared prediction response')
}

async function bundlesForMembers(loader, members) {
  const settled = await Promise.allSettled(members.map(member => loader(member.userId)))
  return Object.fromEntries(members.map((member, index) => {
    const result = settled[index]
    return [member.userId, result.status === 'fulfilled'
      ? result.value
      : { visible: false, reason: 'This member prediction could not be loaded.' }]
  }))
}

export async function loadMatchCentre(client, { reference, requestedMatchNumber, competitionKey, leagueId = null }) {
  if (!client) throw new Error('Euro 2028 data could not be loaded right now.')
  if (!reference?.tournamentId) throw new Error('The Euro tournament reference is unavailable.')

  const [liveSnapshot, currentSession] = await Promise.all([
    loadCanonicalTournamentSnapshot(client, reference),
    session(client),
  ])
  const matchNumber = Number(requestedMatchNumber) || defaultMatchNumber(reference, liveSnapshot)
  const navigation = buildMatchCentreNavigation({ reference, liveSnapshot, matchNumber })
  const safeCompetitionKey = navigation.current.matchNumber <= 36 ? RESULT_COMPETITION.ORIGINAL : competitionKey
  const userId = currentSession?.user?.id ?? null

  if (!userId) {
    return Object.freeze({
      signedIn: false,
      currentUserId: null,
      navigation,
      scopes: Object.freeze([]),
      selectedScope: 'overall',
      competitionKey: safeCompetitionKey,
      impact: null,
      groupContext: buildGroupMatchCentreContext({ fixture: navigation.current, liveSnapshot, impact: null }),
    })
  }

  const leagues = await getMyLeagues(client, reference.tournamentId)
  const scopes = Object.freeze([
    Object.freeze({ id: 'overall', label: 'Overall' }),
    ...leagues.map(league => Object.freeze({ id: league.id, label: league.name })),
  ])
  const selectedLeague = leagues.find(league => league.id === leagueId) ?? null
  const members = selectedLeague
    ? await getLeagueStandings(client, { leagueId: selectedLeague.id, competitionKey: safeCompetitionKey })
    : await overallStandings(client, reference.tournamentId, safeCompetitionKey)
  const bundleLoader = selectedLeague
    ? memberUserId => getLeagueMemberPredictions(client, { leagueId: selectedLeague.id, memberUserId, competitionKey: safeCompetitionKey })
    : memberUserId => overallBundle(client, reference.tournamentId, memberUserId, safeCompetitionKey)
  const bundlesByUserId = await bundlesForMembers(bundleLoader, members)
  const impact = buildFixtureImpact({
    members,
    bundlesByUserId,
    competitionKey: safeCompetitionKey,
    matchNumber: navigation.current.matchNumber,
    reference,
    currentUserId: userId,
  })

  return Object.freeze({
    signedIn: true,
    currentUserId: userId,
    navigation,
    scopes,
    selectedScope: selectedLeague?.id ?? 'overall',
    competitionKey: safeCompetitionKey,
    impact,
    groupContext: buildGroupMatchCentreContext({ fixture: navigation.current, liveSnapshot, impact }),
  })
}
