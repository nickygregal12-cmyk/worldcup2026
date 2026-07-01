import { describe, expect, it } from 'vitest'
import { buildGuestReference, ALL_HOME_KNOCKOUT, COMPLETE_GROUP_SCORES } from '../../guest/__tests__/fixtures.js'
import { createGuestPredictionState, updateGuestGroupPrediction, updateGuestKnockoutPrediction } from '../../guest/guestPredictionState.js'
import { buildCompleteGuestImportRows, buildPredictionSaveRequest } from '../predictionSaveBundle.js'

function completeState(reference) {
  let state = createGuestPredictionState(reference)
  for (let matchNumber = 1; matchNumber <= 36; matchNumber += 1) {
    const [homeScore, awayScore] = COMPLETE_GROUP_SCORES[(matchNumber - 1) % 6]
    state = updateGuestGroupPrediction(state, { matchNumber, homeScore, awayScore })
  }
  for (const [matchNumber, advancingTeamId] of ALL_HOME_KNOCKOUT) {
    state = updateGuestKnockoutPrediction(state, {
      matchNumber,
      homeScore: 2,
      awayScore: 0,
      advancingTeamId,
      decisionMethod: 'normal_time',
    })
  }
  return state
}

describe('prediction save bundle', () => {
  it('builds all 51 canonical database rows from a complete guest draft', () => {
    const reference = buildGuestReference()
    const rows = buildCompleteGuestImportRows(reference, completeState(reference))
    expect(rows).toHaveLength(51)
    expect(rows[0]).toMatchObject({ match_id: 'match-1', advancing_tournament_team_id: null })
    expect(rows[50]).toMatchObject({ match_id: 'match-51', advancing_tournament_team_id: 'B1' })
  })

  it('rejects an incomplete guest draft', () => {
    const reference = buildGuestReference()
    expect(() => buildCompleteGuestImportRows(reference, createGuestPredictionState(reference)))
      .toThrow(/all 51 valid predictions/i)
  })

  it('requires the 15 knockout match database references', () => {
    const reference = { ...buildGuestReference(), knockoutMatches: [] }
    expect(() => buildCompleteGuestImportRows(reference, completeState(buildGuestReference())))
      .toThrow(/15 knockout matches/i)
  })

  it('builds the exact RPC argument object', () => {
    const rows = [{
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
