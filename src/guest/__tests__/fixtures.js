import { RESOLVER_CONTEXT } from '../../resolver/index.js'

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F']
const FIXTURE_ISO_CODES = ['SCO','GER','ESP','CRO','ENG','ITA','DEN','SUI','FRA','NED','AUT','POL','POR','BEL','TUR','CZE','WAL','IRL','NOR','SWE','NIR','UKR','SRB','ROU']
const PAIRINGS = [
  [1, 2],
  [3, 4],
  [1, 3],
  [2, 4],
  [4, 1],
  [2, 3],
]

export function buildGuestReference() {
  let matchNumber = 1
  const groups = GROUP_CODES.map((code, groupIndex) => ({
    code,
    groupId: `group-${code}`,
    teams: [1, 2, 3, 4].map(position => ({
      teamId: `${code}${position}`,
      tournamentTeamId: `${code}${position}`,
      slotCode: `${code}${position}`,
      stableKey: `${code}${position}`,
      label: `Group ${code} slot ${position}`,
      isoCode: FIXTURE_ISO_CODES[(groupIndex * 4) + position - 1],
      drawPosition: position,
      qualifierRank: (groupIndex * 4) + position,
      isProvisional: true,
    })),
  }))
  const groupMatches = []
  for (const code of GROUP_CODES) {
    for (const [home, away] of PAIRINGS) {
      groupMatches.push({
        context: RESOLVER_CONTEXT.GUEST,
        matchId: `match-${matchNumber}`,
        matchNumber,
        fixtureCode: `GS-${code}-${code}${home}-${code}${away}`,
        groupCode: code,
        scheduledDate: '2028-06-09',
        kickoffAt: null,
        status: 'scheduled',
        resultStatus: 'pending',
        homeTeamId: `${code}${home}`,
        awayTeamId: `${code}${away}`,
        homeScore: null,
        awayScore: null,
      })
      matchNumber += 1
    }
  }

  return {
    modelVersion: 'euro28-guest-reference-v2',
    referenceVersion: 'euro28-guest-reference-v2:2025-11-12',
    scheduleVersion: '2025-11-12',
    context: RESOLVER_CONTEXT.GUEST,
    resolverHealthy: true,
    tournamentId: 'tournament-euro-2028',
    tournamentCode: 'euro-2028',
    tournamentName: 'UEFA EURO 2028',
    groups,
    groupMatches,
    knockoutMatches: Array.from({ length: 15 }, (_, index) => ({
      matchId: `match-${index + 37}`,
      matchNumber: index + 37,
      fixtureCode: `KO-${index + 37}`,
      scheduledDate: '2028-06-22',
      kickoffAt: null,
      status: 'scheduled',
    })),
    knockoutMatchNumbers: Array.from({ length: 15 }, (_, index) => index + 37),
    teamsById: Object.fromEntries(groups.flatMap(group => group.teams.map(team => [team.teamId, team]))),
  }
}

export function buildRawReferenceRows() {
  const reference = buildGuestReference()
  const stages = [
    { id: 'stage-group', stage_type: 'group' },
    { id: 'stage-r16', stage_type: 'knockout' },
  ]
  const groups = reference.groups.map((group, index) => ({
    id: group.groupId,
    code: group.code,
    sequence: index + 1,
  }))
  const tournamentTeams = reference.groups.flatMap(group => group.teams.map(team => ({
    id: team.teamId,
    team_id: null,
    slot_code: team.slotCode,
    display_order: team.qualifierRank,
    is_provisional: true,
    metadata: { label: team.label, isoCode: team.isoCode ?? null },
  })))
  const groupMemberships = reference.groups.flatMap(group => group.teams.map(team => ({
    group_id: group.groupId,
    tournament_team_id: team.teamId,
    draw_position: team.drawPosition,
    position_code: team.slotCode,
  })))
  const matches = [
    ...reference.groupMatches.map(match => ({
    id: match.matchId,
    stage_id: 'stage-group',
    group_id: `group-${match.groupCode}`,
    match_number: match.matchNumber,
    fixture_code: match.fixtureCode,
    scheduled_date: match.scheduledDate,
    status: match.status,
    result_status: match.resultStatus,
  })),
    ...reference.knockoutMatches.map(match => ({
      id: match.matchId,
      stage_id: 'stage-r16',
      group_id: null,
      match_number: match.matchNumber,
      fixture_code: match.fixtureCode,
      scheduled_date: match.scheduledDate,
      kickoff_at: match.kickoffAt,
      status: match.status,
    })),
  ]
  const matchSlots = reference.groupMatches.flatMap(match => [
    {
      match_id: match.matchId,
      side: 'home',
      source_tournament_team_id: match.homeTeamId,
      rule_data: { scheduleVersion: '2025-11-12' },
    },
    {
      match_id: match.matchId,
      side: 'away',
      source_tournament_team_id: match.awayTeamId,
      rule_data: { scheduleVersion: '2025-11-12' },
    },
  ])
  return {
    tournament: { id: reference.tournamentId, code: 'euro-2028', name: 'UEFA EURO 2028' },
    stages,
    groups,
    tournamentTeams,
    groupMemberships,
    matches,
    matchSlots,
  }
}

export const COMPLETE_GROUP_SCORES = [
  [3, 0],
  [2, 0],
  [2, 0],
  [1, 0],
  [0, 1],
  [1, 0],
]

export const ALL_HOME_KNOCKOUT = [
  [37, 'A1'], [38, 'A2'], [39, 'B1'], [40, 'C1'],
  [41, 'F1'], [42, 'D2'], [43, 'D1'], [44, 'E1'],
  [45, 'B1'], [46, 'F1'], [47, 'E1'], [48, 'C1'],
  [49, 'B1'], [50, 'E1'], [51, 'B1'],
]
