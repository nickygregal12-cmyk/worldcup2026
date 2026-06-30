import { describe, expect, it } from 'vitest'
import {
  canEditPredictions,
  canRevealOtherPredictions,
  PREDICTION_LOCK_STATE,
  resolvePredictionLock,
} from '../lockContract.js'

const kickoff = '2028-06-09T19:00:00Z'

describe('single tournament prediction lock', () => {
  it('fails closed while the opening kick-off is unconfirmed', () => {
    const lock = resolvePredictionLock({ now: '2028-01-01T12:00:00Z' })
    expect(lock.state).toBe(PREDICTION_LOCK_STATE.UNCONFIGURED)
    expect(lock.canEdit).toBe(false)
    expect(lock.canReveal).toBe(false)
  })

  it('keeps every prediction editable before the opening kick-off', () => {
    const lock = resolvePredictionLock({
      now: '2028-06-09T18:59:59.999Z',
      openingKickoffAt: kickoff,
    })
    expect(lock.state).toBe(PREDICTION_LOCK_STATE.OPEN)
    expect(lock.canEdit).toBe(true)
    expect(lock.canReveal).toBe(false)
  })

  it('locks at the exact opening kick-off with no grace period', () => {
    const lock = resolvePredictionLock({ now: kickoff, openingKickoffAt: kickoff })
    expect(lock.state).toBe(PREDICTION_LOCK_STATE.LOCKED)
    expect(lock.canEdit).toBe(false)
    expect(lock.canReveal).toBe(true)
  })

  it('uses a persisted lock even if the scheduled kick-off later changes', () => {
    const lock = resolvePredictionLock({
      now: '2028-06-09T18:30:00Z',
      openingKickoffAt: '2028-06-09T21:00:00Z',
      persistedLockedAt: '2028-06-09T18:00:00Z',
    })
    expect(lock.state).toBe(PREDICTION_LOCK_STATE.LOCKED)
    expect(lock.reason).toBe('persisted_lock')
    expect(lock.effectiveLockAt.toISOString()).toBe('2028-06-09T18:00:00.000Z')
  })

  it('exposes simple edit and reveal helpers', () => {
    expect(canEditPredictions({ now: '2028-06-09T18:00:00Z', openingKickoffAt: kickoff })).toBe(true)
    expect(canRevealOtherPredictions({ now: '2028-06-09T20:00:00Z', openingKickoffAt: kickoff })).toBe(true)
  })

  it('rejects invalid timestamps', () => {
    expect(() => resolvePredictionLock({ now: 'not-a-date', openingKickoffAt: kickoff })).toThrow(TypeError)
  })
})
