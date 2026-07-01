import { describe, expect, it } from 'vitest'
import {
  createGuestPredictionBundle,
  importGuestPredictionBundle,
  serialiseGuestPredictionBundle,
} from '../guestPredictionBundle.js'
import {
  createGuestPredictionState,
  updateGuestGroupPrediction,
} from '../guestPredictionState.js'
import { buildGuestReference } from './fixtures.js'

const NOW = '2026-07-01T18:00:00.000Z'

describe('guest prediction bundles', () => {
  it('round-trips browser-only progress without account data', () => {
    const reference = buildGuestReference()
    let state = createGuestPredictionState(reference, { now: NOW })
    state = updateGuestGroupPrediction(state, { matchNumber: 1, homeScore: 2, awayScore: 1 }, { now: NOW })

    const json = serialiseGuestPredictionBundle(state, reference, { now: NOW })
    const bundle = JSON.parse(json)
    const imported = importGuestPredictionBundle(json, reference, createGuestPredictionState(reference, { now: NOW }), { now: NOW })

    expect(bundle.context).toBe('guest')
    expect(bundle).not.toHaveProperty('userId')
    expect(bundle).not.toHaveProperty('email')
    expect(imported.groupPredictions['1']).toMatchObject({ homeScore: 2, awayScore: 1 })
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

  it('rejects duplicate or missing match rows', () => {
    const reference = buildGuestReference()
    const state = createGuestPredictionState(reference, { now: NOW })
    const bundle = createGuestPredictionBundle(state, reference, { now: NOW })
    bundle.predictions.group[1].matchNumber = 1

    expect(() => importGuestPredictionBundle(bundle, reference, state, { now: NOW }))
      .toThrow('duplicate match 1')
  })

  it('rejects non-guest bundle contexts', () => {
    const reference = buildGuestReference()
    const state = createGuestPredictionState(reference, { now: NOW })
    const bundle = createGuestPredictionBundle(state, reference, { now: NOW })
    bundle.context = 'predicted'

    expect(() => importGuestPredictionBundle(bundle, reference, state, { now: NOW }))
      .toThrow('Only guest prediction bundles')
  })
})
