import { describe, expect, it } from 'vitest'
import {
  clearGuestPrediction,
  createGuestPredictionState,
  updateGuestGroupPrediction,
  updateGuestKnockoutPrediction,
  validateGuestPredictionState,
} from '../guestPredictionState.js'
import { buildGuestReference } from './fixtures.js'

const NOW = '2026-07-01T18:00:00.000Z'

describe('guest prediction state', () => {
  it('creates a complete browser-only draft skeleton for all 51 matches', () => {
    const reference = buildGuestReference()
    const state = createGuestPredictionState(reference, { now: NOW })

    expect(state.context).toBe('guest')
    expect(state.revision).toBe(0)
    expect(Object.keys(state.groupPredictions)).toHaveLength(36)
    expect(Object.keys(state.knockoutPredictions)).toHaveLength(15)
    expect(validateGuestPredictionState(state, reference)).toEqual({ valid: true, errors: [] })
  })

  it('supports partial group drafts without sending them to the resolver yet', () => {
    const reference = buildGuestReference()
    const initial = createGuestPredictionState(reference, { now: NOW })
    const next = updateGuestGroupPrediction(initial, {
      matchNumber: 1,
      homeScore: 2,
    }, { now: '2026-07-01T18:01:00.000Z' })

    expect(next.groupPredictions['1']).toMatchObject({ homeScore: 2, awayScore: null })
    expect(next.revision).toBe(1)
    expect(initial.groupPredictions['1'].homeScore).toBeNull()
  })

  it('stores knockout score, advancement, method and joker independently', () => {
    const reference = buildGuestReference()
    const initial = createGuestPredictionState(reference, { now: NOW })
    const next = updateGuestKnockoutPrediction(initial, {
      matchNumber: 37,
      homeScore: 1,
      awayScore: 1,
      advancingTeamId: 'A1',
      decisionMethod: 'penalties',
      jokerApplied: true,
    }, { now: NOW })

    expect(next.knockoutPredictions['37']).toMatchObject({
      homeScore: 1,
      awayScore: 1,
      advancingTeamId: 'A1',
      decisionMethod: 'penalties',
      jokerApplied: true,
    })
  })

  it('rejects administrative result methods and invalid scores', () => {
    const state = createGuestPredictionState(buildGuestReference(), { now: NOW })

    expect(() => updateGuestKnockoutPrediction(state, {
      matchNumber: 37,
      decisionMethod: 'administrative',
    })).toThrow('decisionMethod')
    expect(() => updateGuestGroupPrediction(state, {
      matchNumber: 1,
      homeScore: -1,
    })).toThrow('homeScore')
  })

  it('clears one row without resetting the rest of the workspace', () => {
    const reference = buildGuestReference()
    let state = createGuestPredictionState(reference, { now: NOW })
    state = updateGuestGroupPrediction(state, { matchNumber: 1, homeScore: 2, awayScore: 1 }, { now: NOW })
    state = updateGuestGroupPrediction(state, { matchNumber: 2, homeScore: 1, awayScore: 0 }, { now: NOW })
    state = clearGuestPrediction(state, 1, { now: NOW })

    expect(state.groupPredictions['1'].homeScore).toBeNull()
    expect(state.groupPredictions['2'].homeScore).toBe(1)
  })
})
