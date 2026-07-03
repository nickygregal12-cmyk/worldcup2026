import { buildSharedPredictionJourney, LEAGUE_COMPETITION } from '../leagues/leagueModel.js'

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
    advancingTeamId: null,
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
      advancingTeamId: row.advancingTeamId ?? null,
      advancingTeamLabel: row.advancingTeamLabel ?? 'No selection',
    })
  }

  return Object.freeze({
    ...base,
    score: row.score ?? 'No score',
    matchup: `${row.homeLabel} v ${row.awayLabel}`,
    advancingTeamId: row.advancingTeamId ?? null,
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
