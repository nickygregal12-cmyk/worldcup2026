import { describe, expect, it } from 'vitest'
import {
  clearGuestPrediction,
  createGuestPredictionState,
  updateGuestBracketPrediction,
  updateGuestGroupPrediction,
  validateGuestPredictionState,
} from '../guestPredictionState.js'
import { buildGuestReference } from './fixtures.js'

const NOW = '2026-07-01T18:00:00.000Z'

describe('guest prediction state', () => {
  it('creates the original predictor skeleton: 36 group scores and 15 bracket picks', () => {
    const reference = buildGuestReference()
    const state = createGuestPredictionState(reference, { now: NOW })

    expect(state.context).toBe('guest')
    expect(state.revision).toBe(0)
    expect(Object.keys(state.groupPredictions)).toHaveLength(36)
    expect(Object.keys(state.bracketPredictions)).toHaveLength(15)
    expect(state).not.toHaveProperty('knockoutPredictions')
    expect(validateGuestPredictionState(state, reference)).toEqual({ valid: true, errors: [] })
  })

  it('supports partial group drafts and group jokers', () => {
    const reference = buildGuestReference()
    const initial = createGuestPredictionState(reference, { now: NOW })
    const next = updateGuestGroupPrediction(initial, {
      matchNumber: 1,
      homeScore: 2,
      jokerApplied: true,
    }, { now: '2026-07-01T18:01:00.000Z' })

    expect(next.groupPredictions['1']).toMatchObject({ homeScore: 2, awayScore: null, jokerApplied: true })
    expect(next.revision).toBe(1)
    expect(initial.groupPredictions['1'].homeScore).toBeNull()
  })

  it('stores only an advancing team in the original bracket', () => {
    const reference = buildGuestReference()
    const initial = createGuestPredictionState(reference, { now: NOW })
    const next = updateGuestBracketPrediction(initial, {
      matchNumber: 37,
      advancingTeamId: 'A1',
    }, { now: NOW })

    expect(next.bracketPredictions['37']).toEqual({
      matchNumber: 37,
      advancingTeamId: 'A1',
      updatedAt: NOW,
    })
    expect(next.bracketPredictions['37']).not.toHaveProperty('homeScore')
    expect(next.bracketPredictions['37']).not.toHaveProperty('decisionMethod')
    expect(next.bracketPredictions['37']).not.toHaveProperty('jokerApplied')
  })

  it('rejects invalid group scores and non-string bracket winners', () => {
    const state = createGuestPredictionState(buildGuestReference(), { now: NOW })

    expect(() => updateGuestGroupPrediction(state, {
      matchNumber: 1,
      homeScore: -1,
    })).toThrow('homeScore')
    expect(() => updateGuestBracketPrediction(state, {
      matchNumber: 37,
      advancingTeamId: 123,
    })).toThrow('advancingTeamId')
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
