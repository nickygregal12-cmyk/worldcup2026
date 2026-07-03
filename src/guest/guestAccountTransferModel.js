import { resolveGuestTournamentPreview } from './guestTournamentPreview.js'
import { summariseGuestKoPredictionState } from './guestKoPredictionStorage.js'

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
