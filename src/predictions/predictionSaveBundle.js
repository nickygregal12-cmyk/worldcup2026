import {
  PREDICTION_COMPETITION,
  PREDICTION_ROW_KIND,
  validatePredictionBundleShape,
} from '../contracts/predictionDatabaseContract.js'
import { validateGuestPredictionState } from '../guest/guestPredictionState.js'
import { resolveGuestTournamentPreview } from '../guest/guestTournamentPreview.js'
import { PREDICTION_SAVE_LIMITS, PREDICTION_SAVE_SOURCE } from './predictionSaveConfig.js'

function assertReference(reference) {
  if (!reference?.tournamentId || reference.tournamentCode !== 'euro-2028') throw new TypeError('The Euro 2028 tournament reference is required')
  if (!Array.isArray(reference.groupMatches) || reference.groupMatches.length !== PREDICTION_SAVE_LIMITS.groupMatches) throw new TypeError('The tournament reference requires all 36 group matches')
  if (!Array.isArray(reference.knockoutMatches) || reference.knockoutMatches.length !== PREDICTION_SAVE_LIMITS.bracketMatches) throw new TypeError('The tournament reference requires all 15 bracket matches')
}

function groupRow(match, draft) {
  return {
    prediction_kind: PREDICTION_ROW_KIND.GROUP_SCORE,
    match_id: match.matchId,
    predicted_home_tournament_team_id: match.homeTeamId,
    predicted_away_tournament_team_id: match.awayTeamId,
    home_score_90: draft.homeScore,
    away_score_90: draft.awayScore,
    advancing_tournament_team_id: null,
    decision_method: null,
    joker_applied: Boolean(draft.jokerApplied),
  }
}

function bracketRow(match, bracketMatch, draft) {
  if (!bracketMatch?.participantsResolved) throw new TypeError(`Bracket match ${match.matchNumber} does not have resolved predicted participants`)
  return {
    prediction_kind: PREDICTION_ROW_KIND.BRACKET_PICK,
    match_id: match.matchId,
    predicted_home_tournament_team_id: bracketMatch.homeTeamId,
    predicted_away_tournament_team_id: bracketMatch.awayTeamId,
    home_score_90: null,
    away_score_90: null,
    advancing_tournament_team_id: draft.advancingTeamId,
    decision_method: null,
    joker_applied: false,
  }
}

export function buildCompleteGuestImportRows(reference, state) {
  assertReference(reference)
  const stateValidation = validateGuestPredictionState(state, reference)
  if (!stateValidation.valid) throw new TypeError(stateValidation.errors.join('; '))

  const preview = resolveGuestTournamentPreview(reference, state)
  if (!preview.completeness.overall.readyForAccountImport) throw new TypeError('The guest draft must contain all 36 group scores and 15 bracket picks before account import')

  const rows = [
    ...reference.groupMatches.map(match => groupRow(match, state.groupPredictions[String(match.matchNumber)])),
    ...reference.knockoutMatches.map(match => bracketRow(
      match,
      preview.resolution.knockout.byMatchNumber[match.matchNumber],
      state.bracketPredictions[String(match.matchNumber)],
    )),
  ]
  const validation = validatePredictionBundleShape({ tournament_id: reference.tournamentId, expected_revision: 0, matches: rows })
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  return rows
}

export function buildPredictionSaveRequest({
  tournamentId,
  expectedRevision,
  submitted = false,
  predictions,
  source = PREDICTION_SAVE_SOURCE.ACCOUNT,
}) {
  if (!Object.values(PREDICTION_SAVE_SOURCE).includes(source)) throw new TypeError('Unsupported prediction save source')
  const bundle = { tournament_id: tournamentId, expected_revision: expectedRevision, matches: predictions }
  const validation = validatePredictionBundleShape(bundle, { competitionKey: PREDICTION_COMPETITION.ORIGINAL })
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  if (typeof submitted !== 'boolean') throw new TypeError('submitted must be a boolean')

  return Object.freeze({
    p_tournament_id: tournamentId,
    p_expected_revision: expectedRevision,
    p_submitted: submitted,
    p_predictions: predictions.map(row => ({ ...row })),
    p_source: source,
  })
}
