import { describe, expect, it } from 'vitest'
import {
  createGuestPredictionBundle,
  importGuestPredictionBundle,
  serialiseGuestPredictionBundle,
} from '../guestPredictionBundle.js'
import {
  createGuestPredictionState,
  updateGuestBracketPrediction,
  updateGuestGroupPrediction,
} from '../guestPredictionState.js'
import { buildGuestReference } from './fixtures.js'

const NOW = '2026-07-01T18:00:00.000Z'

describe('guest prediction bundles', () => {
  it('round-trips original-predictor progress without account data or KO Predictor scores', () => {
    const reference = buildGuestReference()
    let state = createGuestPredictionState(reference, { now: NOW })
    state = updateGuestGroupPrediction(state, { matchNumber: 1, homeScore: 2, awayScore: 1 }, { now: NOW })
    state = updateGuestBracketPrediction(state, { matchNumber: 37, advancingTeamId: 'A1' }, { now: NOW })

    const json = serialiseGuestPredictionBundle(state, reference, { now: NOW })
    const bundle = JSON.parse(json)
    const imported = importGuestPredictionBundle(json, reference, createGuestPredictionState(reference, { now: NOW }), { now: NOW })

    expect(bundle.context).toBe('guest')
    expect(bundle.competition).toBe('original')
    expect(bundle.predictions).toHaveProperty('bracket')
    expect(bundle.predictions).not.toHaveProperty('koPredictor')
    expect(bundle).not.toHaveProperty('userId')
    expect(bundle).not.toHaveProperty('email')
    expect(imported.groupPredictions['1']).toMatchObject({ homeScore: 2, awayScore: 1 })
    expect(imported.bracketPredictions['37']).toMatchObject({ advancingTeamId: 'A1' })
    expect(imported.lastImportedAt).toBe(NOW)
  })

  it('rejects a bundle from a different tournament reference', () => {
    const reference = buildGuestReference()
    const state = createGuestPredictionState(reference, { now: NOW })
    const bundle = createGuestPredictionBundle(state, reference, { now: NOW })
    bundle.tournament.referenceVersion = 'different-reference'

    expect(() => importGuestPredictionBundle(bundle, reference, state, { now: NOW }))
      .toThrow('different tournament reference version')
  })

  it('rejects duplicate or missing group rows', () => {
    const reference = buildGuestReference()
    const state = createGuestPredictionState(reference, { now: NOW })
    const bundle = createGuestPredictionBundle(state, reference, { now: NOW })
    bundle.predictions.group[1].matchNumber = 1

    expect(() => importGuestPredictionBundle(bundle, reference, state, { now: NOW }))
      .toThrow('group bundle contains an invalid or duplicate match number')
  })

  it('rejects non-guest or non-original bundle contexts', () => {
    const reference = buildGuestReference()
    const state = createGuestPredictionState(reference, { now: NOW })
    const bundle = createGuestPredictionBundle(state, reference, { now: NOW })
    bundle.context = 'predicted'

    expect(() => importGuestPredictionBundle(bundle, reference, state, { now: NOW }))
      .toThrow('Only original guest prediction bundles')
  })
})
