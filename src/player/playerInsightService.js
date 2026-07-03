import { parseExternal } from '../contracts/externalValidation.js'
import { playerCompetitionPointsSchema } from '../contracts/externalSchemas.js'
import { normalisePointsBreakdown } from '../results/resultModel.js'

function throwForError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

function settledSection(result) {
  if (result.status === 'fulfilled') {
    return Object.freeze({ status: 'ready', data: result.value, error: null })
  }
  return Object.freeze({
    status: 'error',
    data: null,
    error: result.reason instanceof Error ? result.reason.message : String(result.reason),
  })
}

export async function readPlayerCompetitionPoints(client, {
  tournamentId,
  memberUserId,
  competitionKey,
  reference,
}) {
  const response = await client.rpc('get_player_competition_points', {
    p_tournament_id: tournamentId,
    p_member_user_id: memberUserId,
    p_competition_key: competitionKey,
  })
  throwForError(`${competitionKey} player insight read failed`, response.error)
  const payload = parseExternal(
    playerCompetitionPointsSchema,
    response.data ?? {},
    `${competitionKey} player insight response`,
  )
  return normalisePointsBreakdown(payload, competitionKey, reference)
}

export async function loadPlayerInsightPair(client, {
  tournamentId,
  currentUserId,
  otherUserId,
  competitionKey,
  reference,
}) {
  const settled = await Promise.allSettled([
    readPlayerCompetitionPoints(client, {
      tournamentId,
      memberUserId: currentUserId,
      competitionKey,
      reference,
    }),
    readPlayerCompetitionPoints(client, {
      tournamentId,
      memberUserId: otherUserId,
      competitionKey,
      reference,
    }),
  ])

  return Object.freeze({
    current: settledSection(settled[0]),
    other: settledSection(settled[1]),
  })
}
