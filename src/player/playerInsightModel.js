const SUPPORTED_COMPETITIONS = new Set(['original', 'ko_predictor'])

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)))
}

function numberOrZero(value) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number : 0
}

function periodForRow(row) {
  if (row.matchNumber <= 36) {
    const matchday = numberOrZero(row.matchday)
    return {
      key: `group-${matchday || 'stage'}`,
      label: matchday ? `Group matchday ${matchday}` : 'Group stage',
      order: matchday || 1,
    }
  }
  if (row.matchNumber <= 44) return { key: 'round-of-16', label: 'Round of 16', order: 4 }
  if (row.matchNumber <= 48) return { key: 'quarter-finals', label: 'Quarter-finals', order: 5 }
  if (row.matchNumber <= 50) return { key: 'semi-finals', label: 'Semi-finals', order: 6 }
  return { key: 'final', label: 'Final', order: 7 }
}

function buildPeriods(rows) {
  const periods = new Map()
  for (const row of rows) {
    const period = periodForRow(row)
    const current = periods.get(period.key) ?? { ...period, points: 0, scoredMatches: 0, rows: [] }
    current.points += row.totalPoints
    current.scoredMatches += 1
    current.rows.push(row)
    periods.set(period.key, current)
  }
  return Object.freeze([...periods.values()]
    .sort((left, right) => left.order - right.order)
    .map(period => Object.freeze({
      ...period,
      rows: freezeRows(period.rows),
    })))
}

function longestScoringStreak(rows) {
  let longest = 0
  let current = 0
  for (const row of rows) {
    if (row.totalPoints > 0) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }
  return longest
}

function rankStory(rows, memberUserId, fallbackTotal) {
  const standing = rows.find(row => row.userId === memberUserId) ?? null
  const currentTotal = numberOrZero(standing?.totalPoints ?? fallbackTotal)
  const totals = rows.map(row => numberOrZero(row.totalPoints))
  const leaderPoints = totals.length > 0 ? Math.max(...totals) : currentTotal
  const higherTotals = [...new Set(totals.filter(total => total > currentTotal))].sort((left, right) => left - right)
  const nextHigherPoints = higherTotals[0] ?? null

  return Object.freeze({
    rank: standing?.rank ?? null,
    totalPoints: currentTotal,
    leaderPoints,
    pointsBehindLeader: Math.max(0, leaderPoints - currentTotal),
    nextHigherPoints,
    pointsToNextScore: nextHigherPoints == null ? 0 : nextHigherPoints - currentTotal,
    tiedPlayerCount: totals.filter(total => total === currentTotal).length || 1,
    isLeader: currentTotal === leaderPoints && rows.length > 0,
  })
}


export function buildPlayerInsightLifecycle({ competitionKey, lifecycle, insightState } = {}) {
  if (!SUPPORTED_COMPETITIONS.has(competitionKey)) throw new TypeError('Unsupported player insight competition')

  const locked = Boolean(lifecycle?.locked)
  const tournamentStarted = Boolean(lifecycle?.tournamentStarted ?? lifecycle?.started ?? lifecycle?.locked)
  const scored = insightState === 'scored'

  if (competitionKey === 'original') {
    if (!locked) {
      return Object.freeze({
        state: 'original_private_until_lock',
        label: 'Original Predictor privacy',
        copy: 'Original Predictor point evidence follows the global prediction lock. You only see picks that are available for this player right now.',
      })
    }
    return Object.freeze({
      state: scored ? 'original_scoring' : 'original_released_waiting_results',
      label: scored ? 'Original points only' : 'Released after global lock',
      copy: scored
        ? 'Original Predictor points come from the 36 group scores and the winner-only pre-tournament bracket. KO Predictor points are shown separately.'
        : 'Original Predictor picks appear after the global lock; point evidence appears once results are scored.',
    })
  }

  if (!tournamentStarted) {
    return Object.freeze({
      state: 'ko_waiting_for_fixture_release',
      label: 'KO Predictor fixture release',
      copy: 'KO Predictor point evidence stays separate and releases fixture by fixture after each real knockout match starts. Future fixtures remain protected by server privacy rules.',
    })
  }

  return Object.freeze({
    state: scored ? 'ko_scoring' : 'ko_fixture_release',
    label: scored ? 'KO points only' : 'Fixture-by-fixture release',
    copy: scored
      ? 'KO Predictor points come from real knockout fixtures only. Original Predictor points are shown separately.'
      : 'KO Predictor point evidence releases only for real knockout fixtures that have individually started.',
  })
}

export function buildPlayerInsight({
  points,
  leaderboardRows = [],
  memberUserId = null,
  competitionKey,
}) {
  if (!SUPPORTED_COMPETITIONS.has(competitionKey)) throw new TypeError('Unsupported player insight competition')

  const resolvedUserId = memberUserId ?? points?.memberUserId ?? null
  const rank = rankStory(leaderboardRows, resolvedUserId, points?.totalPoints)
  const state = points?.state ?? 'unscored'

  if (state === 'protected') {
    return Object.freeze({
      state,
      competitionKey,
      memberUserId: resolvedUserId,
      displayName: points?.displayName ?? null,
      reason: points?.reason ?? 'This player’s points detail is not released yet.',
      rank,
      sources: null,
      statistics: null,
      periods: Object.freeze([]),
      bestPeriod: null,
      bestCalls: Object.freeze([]),
      matchRows: Object.freeze([]),
      bracketRows: Object.freeze([]),
    })
  }

  const matchRows = [...(points?.matchBreakdown ?? [])]
  const bracketRows = [...(points?.bracketBreakdown ?? [])]
  const sources = matchRows.reduce((totals, row) => ({
    exactScore: totals.exactScore + row.exactScorePoints,
    correctOutcome: totals.correctOutcome + row.correctOutcomePoints,
    advancingTeam: totals.advancingTeam + row.advancingTeamPoints,
    decisionMethod: totals.decisionMethod + row.decisionMethodPoints,
    jokerBonus: totals.jokerBonus + row.jokerBonus,
  }), { exactScore: 0, correctOutcome: 0, advancingTeam: 0, decisionMethod: 0, jokerBonus: 0 })
  const bracket = bracketRows.reduce((total, row) => total + row.points, 0)
  const knownPoints = Object.values(sources).reduce((total, value) => total + value, 0) + bracket
  const totalPoints = numberOrZero(points?.totalPoints)
  const highestCall = matchRows.reduce((maximum, row) => Math.max(maximum, row.totalPoints), 0)
  const periods = buildPeriods(matchRows)
  const bestPeriodPoints = periods.reduce((maximum, period) => Math.max(maximum, period.points), 0)

  return Object.freeze({
    state,
    competitionKey,
    memberUserId: resolvedUserId,
    displayName: points?.displayName ?? null,
    reason: points?.reason ?? null,
    rank,
    sources: Object.freeze({
      ...sources,
      bracket,
      knownPoints,
      unallocatedPoints: Math.max(0, totalPoints - knownPoints),
    }),
    statistics: Object.freeze({
      exactScores: matchRows.filter(row => row.exactScorePoints > 0).length,
      correctResults: matchRows.filter(row => row.exactScorePoints > 0 || row.correctOutcomePoints > 0).length,
      successfulJokers: matchRows.filter(row => row.jokerMultiplier > 1 && row.totalPoints > 0).length,
      scoredMatches: numberOrZero(points?.scoredMatchCount),
      correctedMatches: matchRows.filter(row => row.corrected).length,
      longestScoringStreak: longestScoringStreak(matchRows),
    }),
    periods,
    bestPeriod: periods.find(period => period.points === bestPeriodPoints) ?? null,
    bestCalls: freezeRows(matchRows.filter(row => highestCall > 0 && row.totalPoints === highestCall)),
    matchRows: freezeRows(matchRows),
    bracketRows: freezeRows(bracketRows),
  })
}
