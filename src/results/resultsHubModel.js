const ACTIVE_STATES = new Set(['live', 'completed', 'manual_review', 'awaiting_confirmation', 'abandoned'])

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)))
}

export function buildResultsHubModel({ lifecycle, lifecycleState = null, feed }) {
  const sections = feed?.sections ?? { live: [], review: [], completed: [], upcoming: [] }
  const rows = feed?.rows ?? []
  const live = sections.live ?? []
  const review = sections.review ?? []
  const completed = sections.completed ?? []
  const upcoming = sections.upcoming ?? []
  const groupActivity = rows.filter(row => row.matchNumber <= 36 && ACTIVE_STATES.has(row.state))
  const completedGroupMatches = completed.filter(row => row.matchNumber <= 36).length
  const knockoutActivity = rows.filter(row => row.matchNumber > 36 && ACTIVE_STATES.has(row.state))
  const centralLifecycleStarted = lifecycleState
    ? lifecycleState.state !== 'pre_tournament'
    : Boolean(lifecycle?.started || lifecycle?.locked)
  const tournamentStarted = Boolean(centralLifecycleStarted || groupActivity.length || knockoutActivity.length)

  let phase
  let spotlightRows
  if (live.length) {
    phase = { key: 'live', tone: 'danger', eyebrow: 'Live now', title: 'The tournament is moving', body: 'Live scores and their qualification impact take priority.' }
    spotlightRows = live
  } else if (review.length) {
    phase = { key: 'review', tone: 'warning', eyebrow: 'Result review', title: 'Scores awaiting confirmation', body: 'Provisional scores stay separate until the official result is confirmed.' }
    spotlightRows = review.slice(0, 4)
  } else if (completed.length) {
    phase = { key: knockoutActivity.length ? 'knockout' : 'groups', tone: 'safe', eyebrow: knockoutActivity.length ? 'Knockout phase' : 'Group stage', title: 'Latest official results', body: 'Confirmed scores drive the tables and live knockout picture.' }
    spotlightRows = completed.slice(0, 4)
  } else if (!tournamentStarted) {
    phase = { key: 'pre_tournament', tone: 'info', eyebrow: 'Before kick-off', title: 'Fixtures are ready', body: 'Results, tables and the live bracket will take over as soon as the tournament starts.' }
    spotlightRows = upcoming.filter(row => row.matchNumber <= 36).slice(0, 4)
  } else {
    phase = { key: 'quiet', tone: lifecycleState?.tone ?? 'info', eyebrow: 'Between matches', title: lifecycleState?.title ?? 'No match is live right now', body: lifecycleState?.body ?? 'The next fixtures remain ready in Match Centre.' }
    spotlightRows = upcoming.slice(0, 4)
  }

  const spotlightIds = new Set(spotlightRows.map(row => row.matchId))
  const upcomingPhase = knockoutActivity.length > 0 || completedGroupMatches >= 36
    ? upcoming.filter(row => row.matchNumber > 36)
    : upcoming.filter(row => row.matchNumber <= 36)
  const nextRows = tournamentStarted
    ? upcomingPhase.filter(row => !spotlightIds.has(row.matchId)).slice(0, 4)
    : []

  return Object.freeze({
    phase: Object.freeze(phase),
    spotlightTitle: phase.key === 'pre_tournament' ? 'Opening fixtures' : phase.key === 'live' ? 'Live now' : phase.key === 'review' ? 'Awaiting confirmation' : phase.key === 'quiet' ? 'Next fixtures' : 'Latest results',
    spotlightRows: freezeRows(spotlightRows),
    nextRows: freezeRows(nextRows),
    showQualification: groupActivity.length > 0,
    showBracket: completedGroupMatches >= 24 || knockoutActivity.length > 0,
    counts: Object.freeze({ live: live.length, completed: completed.length, review: review.length, upcoming: upcoming.length }),
  })
}
