import { describe, expect, it } from 'vitest'
import {
  canEditJoker,
  canEditPredictions,
  canRevealOtherPredictions,
  canUsePredictionGrace,
  PREDICTION_LOCK_STATE,
  resolvePredictionLock,
} from '../lockContract.js'

const kickoff = '2028-06-09T19:00:00Z'

describe('global tournament prediction-content lock', () => {
  it('fails closed while the opening kick-off is unconfirmed', () => {
    const lock = resolvePredictionLock({ now: '2028-01-01T12:00:00Z' })
    expect(lock.state).toBe(PREDICTION_LOCK_STATE.UNCONFIGURED)
    expect(lock.canEdit).toBe(false)
    expect(lock.canReveal).toBe(false)
  })

  it('keeps prediction content editable before the opening kick-off', () => {
    const lock = resolvePredictionLock({ now: '2028-06-09T18:59:59.999Z', openingKickoffAt: kickoff })
    expect(lock.state).toBe(PREDICTION_LOCK_STATE.OPEN)
    expect(lock.canEdit).toBe(true)
    expect(lock.canReveal).toBe(false)
  })

  it('locks prediction content at the exact opening kick-off', () => {
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
  })

  it('exposes simple edit and reveal helpers', () => {
    expect(canEditPredictions({ now: '2028-06-09T18:00:00Z', openingKickoffAt: kickoff })).toBe(true)
    expect(canRevealOtherPredictions({ now: '2028-06-09T20:00:00Z', openingKickoffAt: kickoff })).toBe(true)
  })
})

describe('per-match joker lock', () => {
  it('allows joker movement only before the target match kicks off', () => {
    expect(canEditJoker({ now: '2028-06-20T17:59:59Z', matchKickoffAt: '2028-06-20T18:00:00Z' })).toBe(true)
    expect(canEditJoker({ now: '2028-06-20T18:00:00Z', matchKickoffAt: '2028-06-20T18:00:00Z' })).toBe(false)
  })

  it('fails closed without a confirmed match kick-off', () => {
    expect(canEditJoker({ now: '2028-06-20T12:00:00Z' })).toBe(false)
  })
})

describe('audited grace-window timing', () => {
  it('allows a grace edit only while the grant is active and the match is unstarted', () => {
    expect(canUsePredictionGrace({
      now: '2028-07-04T12:00:00Z',
      matchKickoffAt: '2028-07-04T19:00:00Z',
      graceExpiresAt: '2028-07-04T12:30:00Z',
    })).toBe(true)
  })

  it('refuses grace after expiry or match kick-off', () => {
    expect(canUsePredictionGrace({
      now: '2028-07-04T12:31:00Z',
      matchKickoffAt: '2028-07-04T19:00:00Z',
      graceExpiresAt: '2028-07-04T12:30:00Z',
    })).toBe(false)
    expect(canUsePredictionGrace({
      now: '2028-07-04T19:00:00Z',
      matchKickoffAt: '2028-07-04T19:00:00Z',
      graceExpiresAt: '2028-07-04T19:30:00Z',
    })).toBe(false)
  })

  it('rejects invalid timestamps', () => {
    expect(() => resolvePredictionLock({ now: 'not-a-date', openingKickoffAt: kickoff })).toThrow(TypeError)
  })
})
