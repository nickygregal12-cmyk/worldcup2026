import { describe, expect, it } from 'vitest'
import { buildGuestReference, ALL_HOME_KNOCKOUT, COMPLETE_GROUP_SCORES } from '../../guest/__tests__/fixtures.js'
import { createGuestPredictionState, updateGuestBracketPrediction, updateGuestGroupPrediction } from '../../guest/guestPredictionState.js'
import { PREDICTION_ROW_KIND } from '../../contracts/predictionDatabaseContract.js'
import { buildCompleteGuestImportRows, buildPredictionSaveRequest } from '../predictionSaveBundle.js'

function completeState(reference) {
  let state = createGuestPredictionState(reference)
  for (let matchNumber = 1; matchNumber <= 36; matchNumber += 1) {
    const [homeScore, awayScore] = COMPLETE_GROUP_SCORES[(matchNumber - 1) % 6]
    state = updateGuestGroupPrediction(state, { matchNumber, homeScore, awayScore })
  }
  for (const [matchNumber, advancingTeamId] of ALL_HOME_KNOCKOUT) {
    state = updateGuestBracketPrediction(state, { matchNumber, advancingTeamId })
  }
  return state
}

describe('prediction save bundle', () => {
  it('builds 36 group-score rows and 15 winner-only bracket rows', () => {
    const reference = buildGuestReference()
    const rows = buildCompleteGuestImportRows(reference, completeState(reference))
    expect(rows).toHaveLength(51)
    expect(rows.filter(row => row.prediction_kind === PREDICTION_ROW_KIND.GROUP_SCORE)).toHaveLength(36)
    expect(rows.filter(row => row.prediction_kind === PREDICTION_ROW_KIND.BRACKET_PICK)).toHaveLength(15)
    expect(rows[0]).toMatchObject({
      prediction_kind: PREDICTION_ROW_KIND.GROUP_SCORE,
      match_id: 'match-1',
      advancing_tournament_team_id: null,
    })
    expect(rows[50]).toMatchObject({
      prediction_kind: PREDICTION_ROW_KIND.BRACKET_PICK,
      match_id: 'match-51',
      advancing_tournament_team_id: 'B1',
      home_score_90: null,
      away_score_90: null,
      decision_method: null,
      joker_applied: false,
    })
  })

  it('rejects an incomplete guest draft', () => {
    const reference = buildGuestReference()
    expect(() => buildCompleteGuestImportRows(reference, createGuestPredictionState(reference)))
      .toThrow(/36 group scores and 15 bracket picks/i)
  })

  it('requires the 15 bracket match database references', () => {
    const reference = { ...buildGuestReference(), knockoutMatches: [] }
    expect(() => buildCompleteGuestImportRows(reference, completeState(buildGuestReference())))
      .toThrow(/15 bracket matches/i)
  })

  it('builds the exact original-predictor RPC argument object', () => {
    const rows = [{
      prediction_kind: PREDICTION_ROW_KIND.GROUP_SCORE,
      match_id: 'm1', predicted_home_tournament_team_id: 'a', predicted_away_tournament_team_id: 'b',
      home_score_90: 1, away_score_90: 0, advancing_tournament_team_id: null,
      decision_method: null, joker_applied: false,
    }]
    expect(buildPredictionSaveRequest({
      tournamentId: 't1', expectedRevision: 3, submitted: true, predictions: rows,
    })).toEqual({
      p_tournament_id: 't1', p_expected_revision: 3, p_submitted: true,
      p_predictions: rows, p_source: 'account',
    })
  })

  it('rejects an unsupported save source', () => {
    expect(() => buildPredictionSaveRequest({
      tournamentId: 't1', expectedRevision: 0, predictions: [], source: 'automatic_guest_upload',
    })).toThrow(/unsupported prediction save source/i)
  })
})
