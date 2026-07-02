import { loadCanonicalTournamentSnapshot } from '../results/resultService.js'
import { buildTeamTournamentSummary, mergeTeamProfileSections } from './teamProfileModel.js'

function throwForError(label, error) {
  if (error) throw new Error(`${label}: ${error.message}`)
}

async function readProfileContent(client, tournamentId, tournamentTeamId) {
  const response = await client.rpc('get_team_profile_sheet', {
    p_tournament_id: tournamentId,
    p_tournament_team_id: tournamentTeamId,
  })
  throwForError('Team profile read failed', response.error)
  return response.data ?? {}
}

export async function loadTeamProfileSheet(client, { reference, team }) {
  if (!client) throw new Error('The Euro staging database client is unavailable.')
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
