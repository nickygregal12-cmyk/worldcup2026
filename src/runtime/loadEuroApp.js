import { buildGuestReferenceModel } from '../guest/guestReferenceModel.js'
import { EURO_TOURNAMENT_CODE, summariseFoundationData } from './appModel.js'
import { parseExternal } from '../contracts/externalValidation.js'
import {
  foundationGroupRowsSchema,
  foundationStageRowsSchema,
  groupMembershipRowsSchema,
  matchRowsSchema,
  matchSlotRowsSchema,
  tournamentRowSchema,
  tournamentTeamRowsSchema,
  tournamentVenueRowsSchema,
} from '../contracts/externalSchemas.js'

function throwForError(label, error) {
  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }
}

export async function loadEuroApp(client) {
  if (!client) throw new Error('Euro 2028 data could not be loaded right now.')

  const tournamentResult = await client
    .from('tournaments')
    .select('id,code,name,short_name,edition_year,timezone,format_code,team_count,group_count,teams_per_group,best_third_qualifiers,status,is_public,is_provisional,starts_on,ends_on,prediction_lock_at,prediction_locked_at')
    .eq('code', EURO_TOURNAMENT_CODE)
    .single()

  throwForError('Tournament read failed', tournamentResult.error)
  const tournament = parseExternal(tournamentRowSchema, tournamentResult.data, 'Tournament response')

  const [
    stagesResult,
    groupsResult,
    tournamentTeamsResult,
    tournamentVenuesResult,
    groupMembershipsResult,
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
      .select('id,slot_code,team_id,qualification_status,is_provisional,display_order,metadata')
      .eq('tournament_id', tournament.id)
      .order('display_order'),
    client
      .from('tournament_venues')
      .select('venue_id,is_provisional,display_order')
      .eq('tournament_id', tournament.id)
      .order('display_order'),
    client
      .from('group_memberships')
      .select('group_id,tournament_team_id,draw_position,position_code,is_provisional')
      .eq('tournament_id', tournament.id)
      .order('position_code'),
    client
      .from('matches')
      .select('id,stage_id,group_id,venue_id,match_number,fixture_code,scheduled_date,kickoff_at,status,result_status,schedule_status,participants_status,venue:venues!matches_venue_id_fkey(name,city)')
      .eq('tournament_id', tournament.id)
      .order('match_number'),
    client
      .from('match_slots')
      .select('id,match_id,side,source_type,source_tournament_team_id,rule_code,rule_data,resolved_tournament_team_id')
      .eq('tournament_id', tournament.id),
  ])

  throwForError('Stage read failed', stagesResult.error)
  throwForError('Group read failed', groupsResult.error)
  throwForError('Tournament-slot read failed', tournamentTeamsResult.error)
  throwForError('Venue read failed', tournamentVenuesResult.error)
  throwForError('Group-membership read failed', groupMembershipsResult.error)
  throwForError('Match read failed', matchesResult.error)
  throwForError('Match-slot read failed', matchSlotsResult.error)

  const sourceRows = {
    tournament,
    stages: parseExternal(foundationStageRowsSchema, stagesResult.data ?? [], 'Tournament stages response'),
    groups: parseExternal(foundationGroupRowsSchema, groupsResult.data ?? [], 'Tournament groups response'),
    tournamentTeams: parseExternal(tournamentTeamRowsSchema, tournamentTeamsResult.data ?? [], 'Tournament teams response'),
    groupMemberships: parseExternal(groupMembershipRowsSchema, groupMembershipsResult.data ?? [], 'Group memberships response'),
    tournamentVenues: parseExternal(tournamentVenueRowsSchema, tournamentVenuesResult.data ?? [], 'Tournament venues response'),
    matches: parseExternal(matchRowsSchema, matchesResult.data ?? [], 'Tournament matches response'),
    matchSlots: parseExternal(matchSlotRowsSchema, matchSlotsResult.data ?? [], 'Match slots response'),
  }

  return {
    ...summariseFoundationData(sourceRows),
    guestReference: buildGuestReferenceModel(sourceRows),
  }
}
