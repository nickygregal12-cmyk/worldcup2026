import { resolveGuestTournamentPreview } from './guestTournamentPreview.js'
import { summariseGuestKoPredictionState } from './guestKoPredictionStorage.js'

export const GUEST_IMPORT_PROMPT_COPY = Object.freeze({
  heading: 'Import your saved Euro 2028 predictions?',
  primaryAction: 'Import predictions to my account',
  secondaryAction: 'Start fresh',
})

function formatList(items) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
}

export function buildGuestAccountTransferPrompt(summary) {
  const found = []
  if (summary?.hasOriginal) {
    found.push('group scores')
    found.push('bracket picks')
  }
  if (summary?.hasKo) found.push('a KO Predictor draft')

  const foundCopy = found.length
    ? `We found ${formatList(found)} on this device.`
    : 'No saved Euro 2028 predictions were found on this device.'

  return Object.freeze({
    heading: GUEST_IMPORT_PROMPT_COPY.heading,
    helper: `${foundCopy} Choose whether to import them to this account or start fresh.`,
    primaryAction: GUEST_IMPORT_PROMPT_COPY.primaryAction,
    secondaryAction: GUEST_IMPORT_PROMPT_COPY.secondaryAction,
  })
}

export function countTouchedOriginalRows(state) {
  if (!state) return 0
  const groups = Object.values(state.groupPredictions ?? {}).filter(row => (
    row.homeScore != null || row.awayScore != null || row.jokerApplied
  )).length
  const bracket = Object.values(state.bracketPredictions ?? {}).filter(row => row.advancingTeamId).length
  return groups + bracket
}

export function countTouchedGuestKoRows(state) {
  if (!state?.rows) return 0
  return Object.values(state.rows).filter(row => (
    row.homeScore != null || row.awayScore != null || row.advancingTeamId || row.decisionMethod || row.jokerApplied
  )).length
}

export function buildGuestAccountTransferSummary({
  reference,
  originalState,
  koState,
  accountOriginal,
  accountKo,
}) {
  const originalCompleteness = originalState
    ? resolveGuestTournamentPreview(reference, originalState).completeness.overall
    : { complete: 0, remaining: 51, readyForAccountImport: false }
  const koSummary = koState
    ? summariseGuestKoPredictionState(reference, koState)
    : { complete: 0, available: reference.knockoutMatches.filter(match => match.participantsResolved).length }
  const originalTouched = countTouchedOriginalRows(originalState)
  const koTouched = countTouchedGuestKoRows(koState)
  const hasOriginal = originalTouched > 0
  const hasKo = koTouched > 0
  const canImportOriginal = hasOriginal && originalCompleteness.readyForAccountImport && !accountOriginal
  const canImportKo = koSummary.complete > 0 && !accountKo

  return Object.freeze({
    originalCompleteness,
    originalTouched,
    koSummary,
    koTouched,
    hasOriginal,
    hasKo,
    canImportOriginal,
    canImportKo,
    transferable: canImportOriginal || canImportKo,
  })
}
