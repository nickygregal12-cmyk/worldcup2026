export function buildPlayerViewTestReference() {
  const teams = [
    { id: 'team-scotland', label: 'Scotland', fifaCode: 'SCO' },
    { id: 'team-ireland', label: 'Ireland', fifaCode: 'IRL' },
    { id: 'team-wales', label: 'Wales', fifaCode: 'WAL' },
    { id: 'team-france', label: 'France', fifaCode: 'FRA' },
  ]

  const teamsById = Object.freeze(Object.fromEntries(teams.map(team => [team.id, team])))

  return Object.freeze({
    tournamentId: 'euro28-test',
    referenceVersion: 'player-view-test',
    teams: Object.freeze(teams),
    teamsById,
    groups: Object.freeze([
      Object.freeze({ code: 'A', label: 'Group A' }),
    ]),
    groupMatches: Object.freeze([
      Object.freeze({
        matchId: 'match-1',
        matchNumber: 1,
        groupCode: 'A',
        matchday: 1,
        homeTeamId: 'team-scotland',
        awayTeamId: 'team-ireland',
        status: 'scheduled',
      }),
      Object.freeze({
        matchId: 'match-2',
        matchNumber: 2,
        groupCode: 'A',
        matchday: 1,
        homeTeamId: 'team-wales',
        awayTeamId: 'team-france',
        status: 'scheduled',
      }),
    ]),
    knockoutMatches: Object.freeze([
      Object.freeze({
        matchId: 'match-37',
        matchNumber: 37,
        homeTeamId: 'team-scotland',
        awayTeamId: 'team-wales',
        status: 'scheduled',
        home: Object.freeze({ sourceType: 'group_position', groupCode: 'A', position: 1 }),
        away: Object.freeze({ sourceType: 'group_position', groupCode: 'A', position: 2 }),
      }),
    ]),
  })
}
