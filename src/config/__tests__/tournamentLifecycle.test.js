import { describe, expect, it } from 'vitest'
import { resolveTournamentLifecycle, TOURNAMENT_LIFECYCLE_SOURCE } from '../tournamentLifecycle.js'

describe('tournament lifecycle config', () => {
  it('uses the central provisional prediction lock when staging data has no database lock', () => {
    const lifecycle = resolveTournamentLifecycle({ prediction_lock_at: null, prediction_locked_at: null, starts_on: null }, new Date('2026-07-03T12:00:00Z'))
    expect(lifecycle.lockConfigured).toBe(true)
    expect(lifecycle.locked).toBe(false)
    expect(lifecycle.predictionLockAt).toBe('2028-06-09T19:00:00.000Z')
    expect(lifecycle.source).toBe(TOURNAMENT_LIFECYCLE_SOURCE.CENTRAL_PROVISIONAL)
  })

  it('prefers the database lock over the provisional central fallback', () => {
    const lifecycle = resolveTournamentLifecycle({ prediction_lock_at: '2028-06-09T18:30:00Z', prediction_locked_at: null }, new Date('2026-07-03T12:00:00Z'))
    expect(lifecycle.predictionLockAt).toBe('2028-06-09T18:30:00.000Z')
    expect(lifecycle.source).toBe(TOURNAMENT_LIFECYCLE_SOURCE.DATABASE)
  })

  it('treats an irreversible persisted lock as locked regardless of current time', () => {
    const lifecycle = resolveTournamentLifecycle({ prediction_lock_at: null, prediction_locked_at: '2028-06-09T18:59:00Z' }, new Date('2026-07-03T12:00:00Z'))
    expect(lifecycle.locked).toBe(true)
    expect(lifecycle.source).toBe(TOURNAMENT_LIFECYCLE_SOURCE.LOCKED)
  })
})
