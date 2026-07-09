import { buildGuestReferenceModel } from '../guest/guestReferenceModel.js'
import { resolveActiveScoring } from '../config/scoringConfig.js'
import { EURO_TOURNAMENT_CODE, summariseFoundationData } from './appModel.js'
import { parseExternal } from '../contracts/externalValidation.js'
import {
  foundationGroupRowsSchema,
  foundationStageRowsSchema,
  groupMembershipRowsSchema,
  matchRowsSchema,
  matchSlotRowsSchema,
  scoringRulesetRowSchema,
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
    .select('id,code,name,short_name,edition_year,timezone,format_code,team_count,group_count,teams_per_group,best_third_qualifiers,status,is_public,is_provisional,starts_on,ends_on,prediction_lock_at,prediction_locked_at,active_scoring_ruleset_id')
    .eq('code', EURO_TOURNAMENT_CODE)
    .single()

  throwForError('Tournament read failed', tournamentResult.error)
  const tournament = parseExternal(tournamentRowSchema, tournamentResult.data, 'Tournament response')

  // The active ruleset is what SQL scoring awards from; displayed values flow from it.
  // A tournament without one resolves to the labelled central-provisional fallback.
  let scoringRulesetRow = null
  if (tournament.active_scoring_ruleset_id) {
    const rulesetResult = await client
      .from('scoring_rulesets')
      .select('id,ruleset_key,version,status,match_exact_score_points,match_correct_outcome_points,knockout_advancing_team_points,knockout_decision_method_points,round_of_16_team_points,quarter_final_team_points,semi_final_team_points,finalist_points,champion_points,joker_multiplier,group_stage_joker_cap,knockout_joker_cap')
      .eq('id', tournament.active_scoring_ruleset_id)
      .maybeSingle()
    throwForError('Scoring ruleset read failed', rulesetResult.error)
    scoringRulesetRow = parseExternal(scoringRulesetRowSchema, rulesetResult.data, 'Scoring ruleset response')
  }

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
      .select('venue_id,is_provisional,display_order,venue:venues!tournament_venues_venue_id_fkey(slug,name,city,country_code,metadata)')
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
    scoring: resolveActiveScoring(scoringRulesetRow),
    guestReference: buildGuestReferenceModel(sourceRows),
  }
}
