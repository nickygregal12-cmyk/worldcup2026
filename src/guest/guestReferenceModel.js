import {
  EURO28_GROUP_CODES,
  EURO28_KNOCKOUT_MATCHES,
  RESOLVER_CONTEXT,
} from '../resolver/index.js'
import { GUEST_REFERENCE_MODEL_VERSION } from './guestPredictionConfig.js'

function assertArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`)
}

function requireUnique(rows, keySelector, label) {
  const keys = rows.map(keySelector)
  if (keys.some(key => key == null || key === '')) throw new TypeError(`${label} contains a missing key`)
  if (new Set(keys).size !== keys.length) throw new TypeError(`${label} contains duplicate keys`)
}

function readScheduleVersion(matchSlots) {
  const versions = new Set(
    matchSlots
      .map(slot => slot?.rule_data?.scheduleVersion)
      .filter(Boolean),
  )
  if (versions.size > 1) throw new TypeError('Guest reference contains mixed group schedule versions')
  return [...versions][0] ?? 'unversioned'
}

function normaliseTeam(tournamentTeam, membership) {
  return Object.freeze({
    teamId: tournamentTeam.id,
    tournamentTeamId: tournamentTeam.id,
    actualTeamId: tournamentTeam.team_id ?? null,
    slotCode: tournamentTeam.slot_code,
    stableKey: membership.position_code,
    label: tournamentTeam.metadata?.label ?? membership.position_code,
    isoCode: tournamentTeam.metadata?.isoCode ?? tournamentTeam.metadata?.fifaCode ?? null,
    drawPosition: membership.draw_position,
    qualifierRank: tournamentTeam.display_order ?? null,
    isProvisional: Boolean(tournamentTeam.is_provisional),
  })
}

export function buildGuestReferenceModel({
  tournament,
  stages,
  groups,
  tournamentTeams,
  groupMemberships,
  matches,
  matchSlots,
}) {
  if (!tournament?.id || tournament.code !== 'euro-2028') {
    throw new TypeError('Guest reference requires the Euro 2028 tournament row')
  }
  for (const [value, label] of [
    [stages, 'stages'],
    [groups, 'groups'],
    [tournamentTeams, 'tournamentTeams'],
    [groupMemberships, 'groupMemberships'],
    [matches, 'matches'],
    [matchSlots, 'matchSlots'],
  ]) assertArray(value, label)

  const groupStageIds = new Set(stages.filter(stage => stage.stage_type === 'group').map(stage => stage.id))
  const knockoutStageIds = new Set(stages.filter(stage => stage.stage_type === 'knockout').map(stage => stage.id))
  const groupMatches = matches.filter(match => groupStageIds.has(match.stage_id))
  const knockoutMatches = matches.filter(match => knockoutStageIds.has(match.stage_id))
  const groupMatchIds = new Set(groupMatches.map(match => match.id))
  const groupMatchSlots = matchSlots.filter(slot => groupMatchIds.has(slot.match_id))

  if (groups.length !== 6) throw new TypeError('Guest reference requires six groups')
  if (tournamentTeams.length !== 24) throw new TypeError('Guest reference requires 24 tournament teams')
  if (groupMemberships.length !== 24) throw new TypeError('Guest reference requires 24 group memberships')
  if (groupMatches.length !== 36) throw new TypeError('Guest reference requires 36 group matches')
  if (knockoutMatches.length !== 15) throw new TypeError('Guest reference requires 15 knockout matches')
  if (groupMatchSlots.length !== 72) throw new TypeError('Guest reference requires 72 group match slots')

  requireUnique(groups, row => row.id, 'groups')
  requireUnique(tournamentTeams, row => row.id, 'tournamentTeams')
  requireUnique(groupMemberships, row => row.position_code, 'groupMemberships')
  requireUnique(groupMatches, row => row.match_number, 'groupMatches')
  requireUnique(knockoutMatches, row => row.match_number, 'knockoutMatches')

  const teamById = new Map(tournamentTeams.map(team => [team.id, team]))
  const groupById = new Map(groups.map(group => [group.id, group]))
  const slotsByMatch = new Map()

  for (const slot of groupMatchSlots) {
    if (!['home', 'away'].includes(slot.side)) throw new TypeError('Group match slot side must be home or away')
    if (!slot.source_tournament_team_id) throw new TypeError('Group match slots require source tournament teams')
    const existing = slotsByMatch.get(slot.match_id) ?? {}
    if (existing[slot.side]) throw new TypeError(`Group match ${slot.match_id} has duplicate ${slot.side} slots`)
    slotsByMatch.set(slot.match_id, { ...existing, [slot.side]: slot })
  }

  const resolverGroups = [...groups]
    .sort((left, right) => left.sequence - right.sequence)
    .map(group => {
      if (!EURO28_GROUP_CODES.includes(group.code)) throw new TypeError(`Unsupported group ${group.code}`)
      const memberships = groupMemberships
        .filter(row => row.group_id === group.id)
        .sort((left, right) => left.draw_position - right.draw_position)
      if (memberships.length !== 4) throw new TypeError(`Group ${group.code} requires four memberships`)

      return Object.freeze({
        code: group.code,
        groupId: group.id,
        teams: Object.freeze(memberships.map(membership => {
          const tournamentTeam = teamById.get(membership.tournament_team_id)
          if (!tournamentTeam) throw new TypeError(`Missing tournament team for ${membership.position_code}`)
          return normaliseTeam(tournamentTeam, membership)
        })),
      })
    })

  if (resolverGroups.map(group => group.code).join('') !== EURO28_GROUP_CODES.join('')) {
    throw new TypeError('Guest reference groups must be ordered A to F')
  }

  const resolverGroupMatches = [...groupMatches]
    .sort((left, right) => left.match_number - right.match_number)
    .map(match => {
      const group = groupById.get(match.group_id)
      const slots = slotsByMatch.get(match.id)
      if (!group || !slots?.home || !slots?.away) {
        throw new TypeError(`Group match ${match.match_number} is missing its group or participants`)
      }
      if (!teamById.has(slots.home.source_tournament_team_id) || !teamById.has(slots.away.source_tournament_team_id)) {
        throw new TypeError(`Group match ${match.match_number} references an unknown tournament team`)
      }

      return Object.freeze({
        context: RESOLVER_CONTEXT.GUEST,
        matchId: match.id,
        matchNumber: match.match_number,
        fixtureCode: match.fixture_code,
        groupCode: group.code,
        scheduledDate: match.scheduled_date ?? null,
        kickoffAt: match.kickoff_at ?? null,
        venueName: match.venue?.name ?? null,
        venueCity: match.venue?.city ?? null,
        status: match.status ?? 'scheduled',
        resultStatus: match.result_status ?? 'pending',
        homeTeamId: slots.home.source_tournament_team_id,
        awayTeamId: slots.away.source_tournament_team_id,
        homeScore: null,
        awayScore: null,
      })
    })

  const allSlotsByMatch = new Map()
  for (const slot of matchSlots) {
    const existing = allSlotsByMatch.get(slot.match_id) ?? {}
    allSlotsByMatch.set(slot.match_id, { ...existing, [slot.side]: slot })
  }

  const resolverKnockoutMatches = [...knockoutMatches]
    .sort((left, right) => left.match_number - right.match_number)
    .map(match => {
      const slots = allSlotsByMatch.get(match.id) ?? {}
      const homeTeamId = slots.home?.resolved_tournament_team_id ?? null
      const awayTeamId = slots.away?.resolved_tournament_team_id ?? null
      return Object.freeze({
        matchId: match.id,
        matchNumber: match.match_number,
        fixtureCode: match.fixture_code,
        scheduledDate: match.scheduled_date ?? null,
        kickoffAt: match.kickoff_at ?? null,
        venueName: match.venue?.name ?? null,
        venueCity: match.venue?.city ?? null,
        status: match.status,
        homeTeamId,
        awayTeamId,
        participantsResolved: Boolean(homeTeamId && awayTeamId),
      })
    })

  if (resolverKnockoutMatches.map(match => match.matchNumber).join(',') !==
      EURO28_KNOCKOUT_MATCHES.map(match => match.matchNumber).join(',')) {
    throw new TypeError('Guest reference knockout matches must be numbered 37 to 51')
  }

  const scheduleVersion = readScheduleVersion(groupMatchSlots)
  const referenceVersion = `${GUEST_REFERENCE_MODEL_VERSION}:${scheduleVersion}`
  const teamsById = Object.fromEntries(
    resolverGroups.flatMap(group => group.teams.map(team => [team.teamId, team])),
  )

  return Object.freeze({
    modelVersion: GUEST_REFERENCE_MODEL_VERSION,
    referenceVersion,
    scheduleVersion,
    context: RESOLVER_CONTEXT.GUEST,
    resolverHealthy: true,
    tournamentId: tournament.id,
    tournamentCode: tournament.code,
    tournamentName: tournament.name,
    groups: Object.freeze(resolverGroups),
    groupMatches: Object.freeze(resolverGroupMatches),
    knockoutMatches: Object.freeze(resolverKnockoutMatches),
    knockoutMatchNumbers: Object.freeze(EURO28_KNOCKOUT_MATCHES.map(match => match.matchNumber)),
    teamsById: Object.freeze(teamsById),
  })
}
