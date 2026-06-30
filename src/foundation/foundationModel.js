export const EURO_TOURNAMENT_CODE = 'euro-2028'

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? 'unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

export function summariseFoundationData({
  tournament,
  stages,
  groups,
  tournamentTeams,
  tournamentVenues,
  matches,
  matchSlots,
}) {
  const stageById = new Map(stages.map(stage => [stage.id, stage]))
  const groupMatches = matches.filter(match => stageById.get(match.stage_id)?.stage_type === 'group')
  const knockoutMatches = matches.filter(match => stageById.get(match.stage_id)?.stage_type === 'knockout')
  const unresolvedTournamentSlots = tournamentTeams.filter(row => !row.team_id).length
  const provisionalTournamentSlots = tournamentTeams.filter(row => row.is_provisional).length
  const confirmedVenues = tournamentVenues.filter(row => !row.is_provisional).length
  const enteredKickoffTimes = matches.filter(row => Boolean(row.kickoff_at)).length
  const officialDateVenueMatches = matches.filter(
    row => row.schedule_status === 'official_date_venue' || row.schedule_status === 'official',
  ).length
  const resolvedMatchSlots = matchSlots.filter(row => Boolean(row.resolved_tournament_team_id)).length
  const bestThirdSources = matchSlots.filter(row => row.source_type === 'best_third').length
  const priorWinnerSources = matchSlots.filter(row => row.source_type === 'match_winner').length

  return {
    tournament,
    stages: [...stages].sort((a, b) => a.sequence - b.sequence),
    groups: [...groups].sort((a, b) => a.sequence - b.sequence),
    totals: {
      stages: stages.length,
      groups: groups.length,
      tournamentSlots: tournamentTeams.length,
      provisionalTournamentSlots,
      unresolvedTournamentSlots,
      venues: tournamentVenues.length,
      confirmedVenues,
      matches: matches.length,
      groupMatches: groupMatches.length,
      knockoutMatches: knockoutMatches.length,
      matchSlots: matchSlots.length,
      resolvedMatchSlots,
      enteredKickoffTimes,
      officialDateVenueMatches,
      bestThirdSources,
      priorWinnerSources,
    },
    certainty: {
      scheduleStatuses: countBy(matches, 'schedule_status'),
      participantStatuses: countBy(matches, 'participants_status'),
    },
  }
}
