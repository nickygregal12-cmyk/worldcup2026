import { describe, expect, it } from 'vitest'
import { buildGuestReference } from './fixtures.js'
import {
  createGuestKoPredictionState,
  createGuestKoPredictionStorage,
  summariseGuestKoPredictionState,
  updateGuestKoPredictionState,
  validateGuestKoPredictionState,
} from '../guestKoPredictionStorage.js'

function resolvedReference(count = 1) {
  const reference = buildGuestReference()
  const knockoutMatches = reference.knockoutMatches.map((match, index) => index < count ? {
    ...match,
    participantsResolved: true,
    homeTeamId: index % 2 === 0 ? 'A1' : 'B1',
    awayTeamId: index % 2 === 0 ? 'A2' : 'B2',
  } : match)
  return { ...reference, knockoutMatches }
}

function memoryStorage() {
  const values = new Map()
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  }
}

describe('guest KO prediction storage', () => {
  it('persists a complete available KO prediction locally', () => {
    const reference = resolvedReference()
    const match = reference.knockoutMatches[0]
    let state = createGuestKoPredictionState(reference, { now: '2026-07-03T00:00:00Z' })
    state = updateGuestKoPredictionState(state, reference, match, { homeScore: 2, awayScore: 1 }, { now: '2026-07-03T00:01:00Z' })

    const storage = createGuestKoPredictionStorage({ storage: memoryStorage(), reference })
    expect(storage.save(state)).toEqual({ status: 'saved', error: null })
    expect(storage.load().state.rows['37']).toMatchObject({
      homeScore: 2,
      awayScore: 1,
      advancingTeamId: 'A1',
      decisionMethod: 'normal_time',
    })
    expect(summariseGuestKoPredictionState(reference, state).complete).toBe(1)
  })

  it('enforces the separate five-joker cap', () => {
    const reference = resolvedReference(6)
    let state = createGuestKoPredictionState(reference)
    for (const match of reference.knockoutMatches.slice(0, 5)) {
      state = updateGuestKoPredictionState(state, reference, match, { jokerApplied: true })
    }
    expect(() => updateGuestKoPredictionState(state, reference, reference.knockoutMatches[5], { jokerApplied: true }))
      .toThrow('Only 5 KO Predictor jokers')
  })

  it('rejects state from a different reference version', () => {
    const reference = resolvedReference()
    const state = createGuestKoPredictionState(reference)
    expect(validateGuestKoPredictionState(state, { ...reference, referenceVersion: 'different' }).valid).toBe(false)
  })
})
