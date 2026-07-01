import { describe, expect, it } from 'vitest'
import { PREDICTION_ROW_KIND } from '../../contracts/predictionDatabaseContract.js'
import { buildGuestReference } from '../../guest/__tests__/fixtures.js'
import {
  buildKoPredictorRows,
  createKoPredictorDraft,
  summariseKoPredictor,
  updateKoPredictorDraft,
} from '../koPredictorModel.js'

function resolvedReference(count = 2) {
  const reference = buildGuestReference()
  return {
    ...reference,
    knockoutMatches: reference.knockoutMatches.map((match, index) => index < count
      ? {
          ...match,
          homeTeamId: index === 0 ? 'A1' : 'B1',
          awayTeamId: index === 0 ? 'C2' : 'D2',
          participantsResolved: true,
        }
      : { ...match, homeTeamId: null, awayTeamId: null, participantsResolved: false }),
  }
}

describe('separate KO Predictor model', () => {
  it('starts with 15 separate knockout rows and no original competition state', () => {
    const reference = resolvedReference()
    const draft = createKoPredictorDraft(reference)

    expect(Object.keys(draft.rows)).toHaveLength(15)
    expect(draft.rows['37']).toMatchObject({ jokerApplied: false, homeScore: null, awayScore: null })
    expect(draft).not.toHaveProperty('groupPredictions')
    expect(draft).not.toHaveProperty('bracketPredictions')
  })

  it('normalises a non-draw score to the real-match winner and normal time', () => {
    const reference = resolvedReference(1)
    const match = reference.knockoutMatches[0]
    const draft = updateKoPredictorDraft(createKoPredictorDraft(reference), match, {
      homeScore: 2,
      awayScore: 0,
    })

    expect(draft.rows['37']).toMatchObject({
      advancingTeamId: 'A1',
      decisionMethod: 'normal_time',
    })
  })

  it('keeps a drawn 90-minute score separate from the advancing team and method', () => {
    const reference = resolvedReference(1)
    const match = reference.knockoutMatches[0]
    let draft = updateKoPredictorDraft(createKoPredictorDraft(reference), match, {
      homeScore: 1,
      awayScore: 1,
    })
    draft = updateKoPredictorDraft(draft, match, {
      advancingTeamId: 'C2',
      decisionMethod: 'penalties',
    })

    expect(draft.rows['37']).toMatchObject({
      homeScore: 1,
      awayScore: 1,
      advancingTeamId: 'C2',
      decisionMethod: 'penalties',
    })
  })

  it('enforces five KO Predictor jokers independently', () => {
    const reference = resolvedReference(6)
    let draft = createKoPredictorDraft(reference)
    for (let index = 0; index < 5; index += 1) {
      draft = updateKoPredictorDraft(draft, reference.knockoutMatches[index], { jokerApplied: true })
    }

    expect(() => updateKoPredictorDraft(draft, reference.knockoutMatches[5], { jokerApplied: true }))
      .toThrow('Only 5 KO Predictor jokers')
  })

  it('builds only real-fixture KO score rows for the separate RPC', () => {
    const reference = resolvedReference(1)
    const match = reference.knockoutMatches[0]
    let draft = createKoPredictorDraft(reference)
    draft = updateKoPredictorDraft(draft, match, { homeScore: 1, awayScore: 1 })
    draft = updateKoPredictorDraft(draft, match, {
      advancingTeamId: 'A1',
      decisionMethod: 'extra_time',
      jokerApplied: true,
    })

    const rows = buildKoPredictorRows(reference, draft)
    expect(rows).toEqual([expect.objectContaining({
      prediction_kind: PREDICTION_ROW_KIND.KO_MATCH_SCORE,
      match_id: 'match-37',
      home_score_90: 1,
      away_score_90: 1,
      advancing_tournament_team_id: 'A1',
      decision_method: 'extra_time',
      joker_applied: true,
    })])
    expect(summariseKoPredictor(reference, draft)).toMatchObject({
      available: 1,
      complete: 1,
      jokerCount: 1,
      jokerCap: 5,
    })
  })
})
