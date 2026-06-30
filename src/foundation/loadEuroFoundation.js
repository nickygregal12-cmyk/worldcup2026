import { EURO_TOURNAMENT_CODE, summariseFoundationData } from './foundationModel.js'

function throwForError(label, error) {
  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }
}

export async function loadEuroFoundation(client) {
  if (!client) throw new Error('The Euro staging database client is unavailable.')

  const tournamentResult = await client
    .from('tournaments')
    .select('id,code,name,short_name,edition_year,timezone,format_code,team_count,group_count,teams_per_group,best_third_qualifiers,status,is_public,is_provisional,starts_on,ends_on')
    .eq('code', EURO_TOURNAMENT_CODE)
    .single()

  throwForError('Tournament read failed', tournamentResult.error)
  const tournament = tournamentResult.data

  const [
    stagesResult,
    groupsResult,
    tournamentTeamsResult,
    tournamentVenuesResult,
    matchesResult,
    matchSlotsResult,
  ] = await Promise.all([
    client
      .from('tournament_stages')
      .select('id,code,name,stage_type,sequence,expected_match_count,starts_on,ends_on')
      .eq('tournament_id', tournament.id)
      .order('sequence'),
    client
      .from('groups')
      .select('id,code,name,sequence,team_limit,automatic_qualifier_count')
      .eq('tournament_id', tournament.id)
      .order('sequence'),
    client
      .from('tournament_teams')
      .select('id,slot_code,team_id,qualification_status,is_provisional')
      .eq('tournament_id', tournament.id)
      .order('display_order'),
    client
      .from('tournament_venues')
      .select('venue_id,is_provisional,display_order')
      .eq('tournament_id', tournament.id)
      .order('display_order'),
    client
      .from('matches')
      .select('id,stage_id,group_id,venue_id,match_number,fixture_code,scheduled_date,kickoff_at,status,schedule_status,participants_status')
      .eq('tournament_id', tournament.id)
      .order('match_number'),
    client
      .from('match_slots')
      .select('id,match_id,side,source_type,rule_code,resolved_tournament_team_id')
      .eq('tournament_id', tournament.id),
  ])

  throwForError('Stage read failed', stagesResult.error)
  throwForError('Group read failed', groupsResult.error)
  throwForError('Tournament-slot read failed', tournamentTeamsResult.error)
  throwForError('Venue read failed', tournamentVenuesResult.error)
  throwForError('Match read failed', matchesResult.error)
  throwForError('Match-slot read failed', matchSlotsResult.error)

  return summariseFoundationData({
    tournament,
    stages: stagesResult.data || [],
    groups: groupsResult.data || [],
    tournamentTeams: tournamentTeamsResult.data || [],
    tournamentVenues: tournamentVenuesResult.data || [],
    matches: matchesResult.data || [],
    matchSlots: matchSlotsResult.data || [],
  })
}
