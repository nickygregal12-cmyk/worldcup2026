import { loadCanonicalTournamentSnapshot } from '../results/resultService.js'
import { buildTeamTournamentSummary, mergeTeamProfileSections } from './teamProfileModel.js'
import { parseExternal } from '../contracts/externalValidation.js'
import { teamProfilePayloadSchema } from '../contracts/externalSchemas.js'

function throwForError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

async function readProfileContent(client, tournamentId, tournamentTeamId) {
  const response = await client.rpc('get_team_profile_sheet', {
    p_tournament_id: tournamentId,
    p_tournament_team_id: tournamentTeamId,
  })
  throwForError('Team profile read failed', response.error)
  return parseExternal(teamProfilePayloadSchema, response.data ?? {}, 'Team profile response')
}

export async function loadTeamProfileSheet(client, { reference, team }) {
  if (!client) throw new Error('Euro 2028 data could not be loaded right now.')
  const tournamentTeamId = team?.tournamentTeamId ?? team?.teamId
  if (!reference?.tournamentId || !tournamentTeamId) throw new Error('The team profile reference is unavailable.')

  const [contentResult, snapshotResult] = await Promise.allSettled([
    readProfileContent(client, reference.tournamentId, tournamentTeamId),
    loadCanonicalTournamentSnapshot(client, reference),
  ])

  const tournamentResult = snapshotResult.status === 'fulfilled'
    ? { status: 'fulfilled', value: buildTeamTournamentSummary({ reference, liveSnapshot: snapshotResult.value, tournamentTeamId }) }
    : snapshotResult

  return mergeTeamProfileSections({ contentResult, tournamentResult, fallbackTeam: team })
}
