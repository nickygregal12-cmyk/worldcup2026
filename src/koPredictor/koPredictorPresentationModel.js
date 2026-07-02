export const KO_PREDICTOR_ROUNDS = Object.freeze([
  Object.freeze({ key: 'round_of_16', label: 'Round of 16', shortLabel: 'R16', first: 37, last: 44 }),
  Object.freeze({ key: 'quarter_final', label: 'Quarter-finals', shortLabel: 'QF', first: 45, last: 48 }),
  Object.freeze({ key: 'semi_final', label: 'Semi-finals', shortLabel: 'SF', first: 49, last: 50 }),
  Object.freeze({ key: 'final', label: 'Final', shortLabel: 'F', first: 51, last: 51 }),
])

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

export function koRowIsComplete(row) {
  return Boolean(row && isScore(row.homeScore) && isScore(row.awayScore) && row.advancingTeamId && row.decisionMethod)
}

export function koMethodOptions(row) {
  if (!isScore(row?.homeScore) || !isScore(row?.awayScore)) return []
  if (row.homeScore !== row.awayScore) return [Object.freeze({ value: 'normal_time', label: 'Normal time' })]
  return [
    Object.freeze({ value: 'extra_time', label: 'Extra time' }),
    Object.freeze({ value: 'penalties', label: 'Penalties' }),
  ]
}

export function deriveKoMatchPresentation(match, row) {
  const status = String(match?.status ?? 'scheduled').toLowerCase()
  const started = ['live', 'completed', 'finished'].includes(status)
  if (status === 'completed' || status === 'finished') return Object.freeze({ state: 'locked', label: 'Finished', locked: true })
  if (status === 'live') return Object.freeze({ state: 'locked', label: 'Live · locked', locked: true })
  if (started) return Object.freeze({ state: 'locked', label: 'Locked', locked: true })
  if (koRowIsComplete(row)) return Object.freeze({ state: 'complete', label: 'Prediction complete', locked: false })
  return Object.freeze({ state: 'empty', label: 'Needs prediction', locked: false })
}

export function buildKoRoundProgress(reference, draft) {
  return KO_PREDICTOR_ROUNDS.map(round => {
    const matches = reference.knockoutMatches.filter(match => match.matchNumber >= round.first && match.matchNumber <= round.last && match.participantsResolved)
    const complete = matches.filter(match => koRowIsComplete(draft.rows[String(match.matchNumber)])).length
    return Object.freeze({ ...round, available: matches.length, complete, isComplete: matches.length > 0 && complete === matches.length })
  })
}
