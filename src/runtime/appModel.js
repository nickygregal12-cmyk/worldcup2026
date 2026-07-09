export const EURO_TOURNAMENT_CODE = 'euro-2028'

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? 'unknown'
    counts[value] = (counts[value] || 0) + 1
    return counts
  }, {})
}

/**
 * Venue tags are derived from the real fixtures, never stored: the venue that
 * hosts match 1 is the opening venue, semi-final and final venues come from
 * their stages. Stored annotations could silently drift from the schedule.
 */
function deriveVenueTags({ matches, stageById }) {
  const tags = new Map()
  const add = (venueId, tag) => {
    if (!venueId) return
    const list = tags.get(venueId) ?? []
    if (!list.includes(tag)) list.push(tag)
    tags.set(venueId, list)
  }
  for (const match of matches) {
    const stageCode = stageById.get(match.stage_id)?.code
    if (Number(match.match_number) === 1) add(match.venue_id, 'Opening match')
    if (stageCode === 'semi_final') add(match.venue_id, 'Semi-finals')
    if (stageCode === 'final') add(match.venue_id, 'Final')
  }
  return tags
}

/** Opening match, semi-finals and final with real scheduled dates and venues. */
function deriveKeyFixtures({ matches, stageById }) {
  const rows = []
  const push = (label, match) => rows.push(Object.freeze({
    label,
    date: match?.scheduled_date ?? null,
    venueName: match?.venue?.name ?? null,
    city: match?.venue?.city ?? null,
  }))
  push('Opening match', matches.find(match => Number(match.match_number) === 1) ?? null)
  matches
    .filter(match => stageById.get(match.stage_id)?.code === 'semi_final')
    .sort((left, right) => String(left.scheduled_date).localeCompare(String(right.scheduled_date)))
    .forEach((match, index) => push(`Semi-final ${index + 1}`, match))
  push('Final', matches.find(match => stageById.get(match.stage_id)?.code === 'final') ?? null)
  return rows
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
  const venueTags = deriveVenueTags({ matches, stageById })
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
    // Database-driven venue list — the same public.venues rows the match cards
    // render — with editorial hostNation from venues.metadata (Migration 021).
    venues: [...tournamentVenues]
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .map(row => Object.freeze({
        venueId: row.venue_id,
        name: row.venue?.name ?? 'Venue to be confirmed',
        city: row.venue?.city ?? null,
        hostNation: row.venue?.metadata?.hostNation ?? null,
        isProvisional: Boolean(row.is_provisional),
        tags: Object.freeze(venueTags.get(row.venue_id) ?? []),
      })),
    keyFixtures: deriveKeyFixtures({ matches, stageById }),
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
