import { buildSharedPredictionJourney, LEAGUE_COMPETITION } from '../leagues/leagueModel.js'
import { buildPlayerInsight } from './playerInsightModel.js'

export const PLAYER_COMPARISON_CONTEXT = Object.freeze({
  LEAGUE: 'league',
  OVERALL: 'overall',
})

function freezeRows(rows) {
  return Object.freeze(rows.map(row => Object.freeze(row)))
}

function selectionForJourneyRow(row) {
  const base = {
    visibility: row.visibility,
    message: row.message ?? null,
    score: null,
    matchup: null,
    homeTeam: null,
    awayTeam: null,
    advancingTeamId: null,
    advancingTeam: null,
    advancingTeamLabel: null,
    decisionMethod: null,
    decisionMethodLabel: null,
    jokerApplied: false,
  }
  if (row.visibility !== 'visible') return Object.freeze(base)

  if (row.kind === 'bracket') {
    return Object.freeze({
      ...base,
      matchup: `${row.homeLabel} v ${row.awayLabel}`,
      homeTeam: row.homeTeam ?? null,
      awayTeam: row.awayTeam ?? null,
      advancingTeamId: row.advancingTeamId ?? null,
      advancingTeam: row.advancingTeam ?? null,
      advancingTeamLabel: row.advancingTeamLabel ?? 'No selection',
    })
  }

  return Object.freeze({
    ...base,
    score: row.score ?? 'No score',
    matchup: `${row.homeLabel} v ${row.awayLabel}`,
    homeTeam: row.homeTeam ?? null,
    awayTeam: row.awayTeam ?? null,
    advancingTeamId: row.advancingTeamId ?? null,
    advancingTeam: row.advancingTeam ?? null,
    advancingTeamLabel: row.advancingTeamLabel ?? null,
    decisionMethod: row.decisionMethod ?? null,
    decisionMethodLabel: row.decisionMethodLabel ?? null,
    jokerApplied: Boolean(row.jokerApplied),
  })
}

function sameVisibleValue(left, right, field) {
  return left.visibility === 'visible'
    && right.visibility === 'visible'
    && Boolean(left[field])
    && left[field] === right[field]
}

function comparisonForRow(kind, left, right, competitionKey) {
  const comparable = left.visibility === 'visible' && right.visibility === 'visible'
  if (!comparable) {
    return Object.freeze({ comparable: false, same: false, scoreSame: false, advancingSame: false, methodSame: false })
  }

  if (kind === 'bracket') {
    const advancingSame = sameVisibleValue(left, right, 'advancingTeamId')
    return Object.freeze({ comparable: true, same: advancingSame, scoreSame: false, advancingSame, methodSame: false })
  }

  const scoreSame = sameVisibleValue(left, right, 'score')
  if (competitionKey === LEAGUE_COMPETITION.ORIGINAL) {
    return Object.freeze({ comparable: true, same: scoreSame, scoreSame, advancingSame: false, methodSame: false })
  }

  const advancingSame = sameVisibleValue(left, right, 'advancingTeamId')
  const methodSame = sameVisibleValue(left, right, 'decisionMethod')
  return Object.freeze({
    comparable: true,
    same: scoreSame && advancingSame && methodSame,
    scoreSame,
    advancingSame,
    methodSame,
  })
}

function rowKey(row) {
  return `${row.kind}-${row.matchNumber}`
}

export function buildAlignedPlayerComparison({ currentBundle, otherBundle, reference, competitionKey }) {
  const currentJourney = buildSharedPredictionJourney({ bundle: currentBundle, reference, competitionKey })
  const otherJourney = buildSharedPredictionJourney({ bundle: otherBundle, reference, competitionKey })
  const currentRows = [...currentJourney.matches, ...currentJourney.bracket]
  const otherRows = new Map([...otherJourney.matches, ...otherJourney.bracket].map(row => [rowKey(row), row]))

  const rows = currentRows.map(row => {
    const otherRow = otherRows.get(rowKey(row)) ?? { ...row, visibility: 'not_saved', message: 'No comparison row was returned.' }
    const current = selectionForJourneyRow(row)
    const other = selectionForJourneyRow(otherRow)
    return {
      key: rowKey(row),
      kind: row.kind,
      matchNumber: row.matchNumber,
      stageLabel: row.stageLabel,
      fixtureLabel: row.kind === 'match' ? `${row.homeLabel} v ${row.awayLabel}` : 'Predicted knockout tie',
      homeTeam: row.homeTeam ?? null,
      awayTeam: row.awayTeam ?? null,
      current,
      other,
      comparison: comparisonForRow(row.kind, current, other, competitionKey),
    }
  })

  const comparableRows = rows.filter(row => row.comparison.comparable)
  const matchRows = comparableRows.filter(row => row.kind === 'match')
  const bracketRows = comparableRows.filter(row => row.kind === 'bracket')

  const sections = []
  for (const row of rows) {
    const existing = sections.find(section => section.label === row.stageLabel)
    if (existing) existing.rows.push(row)
    else sections.push({ label: row.stageLabel, rows: [row] })
  }

  return Object.freeze({
    competitionKey,
    currentName: currentJourney.displayName,
    otherName: otherJourney.displayName,
    rows: freezeRows(rows),
    sections: Object.freeze(sections.map(section => Object.freeze({ label: section.label, rows: freezeRows(section.rows) }))),
    release: Object.freeze({
      currentState: currentJourney.releaseState,
      otherState: otherJourney.releaseState,
      copy: competitionKey === LEAGUE_COMPETITION.ORIGINAL
        ? 'Original comparisons release all saved selections only after the global lock.'
        : 'KO comparisons release only the real fixtures that have individually started.',
    }),
    summary: Object.freeze({
      comparedSelections: comparableRows.length,
      comparedMatches: matchRows.length,
      exactScoreMatches: matchRows.filter(row => row.comparison.scoreSame).length,
      bracketCompared: bracketRows.length,
      bracketMatches: bracketRows.filter(row => row.comparison.advancingSame).length,
      advancingTeamMatches: matchRows.filter(row => row.comparison.advancingSame).length,
      methodMatches: matchRows.filter(row => row.comparison.methodSame).length,
      fullyMatchedSelections: comparableRows.filter(row => row.comparison.same).length,
      privateSelections: rows.filter(row => row.current.visibility === 'private' || row.other.visibility === 'private').length,
      missingSelections: rows.filter(row => row.current.visibility === 'not_saved' || row.other.visibility === 'not_saved').length,
    }),
  })
}

function sourceRows(current, other, competitionKey) {
  if (!current.sources || !other.sources) return Object.freeze([])
  const definitions = competitionKey === LEAGUE_COMPETITION.ORIGINAL
    ? [
        ['exactScore', 'Exact scores'],
        ['correctOutcome', 'Correct outcomes'],
        ['bracket', 'Original bracket'],
        ['jokerBonus', 'Joker bonus'],
        ['unallocatedPoints', 'Other awarded points'],
      ]
    : [
        ['exactScore', 'Exact 90-minute scores'],
        ['correctOutcome', 'Result components'],
        ['advancingTeam', 'Advancing teams'],
        ['decisionMethod', 'Decision components'],
        ['jokerBonus', 'Joker bonus'],
        ['unallocatedPoints', 'Other awarded points'],
      ]

  return freezeRows(definitions
    .map(([key, label]) => ({
      key,
      label,
      current: Number(current.sources[key] ?? 0),
      other: Number(other.sources[key] ?? 0),
    }))
    .filter(row => row.current > 0 || row.other > 0))
}

function decisiveMatchRows(current, other) {
  const currentByMatch = new Map(current.matchRows.map(row => [row.matchNumber, row]))
  const otherByMatch = new Map(other.matchRows.map(row => [row.matchNumber, row]))
  const matchNumbers = [...new Set([...currentByMatch.keys(), ...otherByMatch.keys()])]
  return freezeRows(matchNumbers.map(matchNumber => {
    const currentRow = currentByMatch.get(matchNumber) ?? null
    const otherRow = otherByMatch.get(matchNumber) ?? null
    const currentPoints = Number(currentRow?.totalPoints ?? 0)
    const otherPoints = Number(otherRow?.totalPoints ?? 0)
    return {
      matchNumber,
      stageLabel: currentRow?.stageLabel ?? otherRow?.stageLabel ?? 'Match',
      currentPoints,
      otherPoints,
      swing: currentPoints - otherPoints,
    }
  })
    .filter(row => row.swing !== 0)
    .sort((left, right) => Math.abs(right.swing) - Math.abs(left.swing) || left.matchNumber - right.matchNumber)
    .slice(0, 4))
}

// The cumulative points race, match by match — built from the same per-match award
// rows the decisive-matches list uses. Existing data only; no new reads.
function raceSeries(current, other) {
  const currentByMatch = new Map(current.matchRows.map(row => [row.matchNumber, row]))
  const otherByMatch = new Map(other.matchRows.map(row => [row.matchNumber, row]))
  const matchNumbers = [...new Set([...currentByMatch.keys(), ...otherByMatch.keys()])].sort((a, b) => a - b)
  let mine = 0
  let theirs = 0
  return freezeRows(matchNumbers.map(matchNumber => {
    mine += Number(currentByMatch.get(matchNumber)?.totalPoints ?? 0)
    theirs += Number(otherByMatch.get(matchNumber)?.totalPoints ?? 0)
    return {
      matchNumber,
      stageLabel: currentByMatch.get(matchNumber)?.stageLabel ?? otherByMatch.get(matchNumber)?.stageLabel ?? 'Match',
      current: mine,
      other: theirs,
    }
  }))
}

export function buildHeadToHeadStory({
  currentSection,
  otherSection,
  currentPlayer,
  otherPlayer,
  competitionKey,
  standingsRows = [],
}) {
  const current = buildPlayerInsight({
    points: currentSection?.status === 'ready' ? currentSection.data : null,
    leaderboardRows: standingsRows,
    memberUserId: currentPlayer?.userId,
    competitionKey,
  })
  const other = buildPlayerInsight({
    points: otherSection?.status === 'ready' ? otherSection.data : null,
    leaderboardRows: standingsRows,
    memberUserId: otherPlayer?.userId,
    competitionKey,
  })
  const currentPoints = current.rank.totalPoints
  const otherPoints = other.rank.totalPoints
  const margin = Math.abs(currentPoints - otherPoints)
  const leader = currentPoints === otherPoints ? 'level' : currentPoints > otherPoints ? 'current' : 'other'
  const currentName = currentPlayer?.displayName ?? 'You'
  const otherName = otherPlayer?.displayName ?? 'Player'
  const headline = leader === 'level'
    ? 'Level on points'
    : `${leader === 'current' ? currentName : otherName} leads by ${margin}`

  return Object.freeze({
    available: current.state === 'scored' || other.state === 'scored',
    currentPoints,
    otherPoints,
    margin,
    leader,
    headline,
    sources: sourceRows(current, other, competitionKey),
    decisiveMatches: decisiveMatchRows(current, other),
    race: raceSeries(current, other),
    currentInsight: current,
    otherInsight: other,
  })
}
