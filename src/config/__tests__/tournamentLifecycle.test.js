import { describe, expect, it } from 'vitest'
import { resolveTournamentLifecycle, TOURNAMENT_LIFECYCLE_SOURCE } from '../tournamentLifecycle.js'

describe('tournament lifecycle config', () => {
  it('reports an unconfigured lock when the database has no lock, instead of masking it', () => {
    const lifecycle = resolveTournamentLifecycle({ prediction_lock_at: null, prediction_locked_at: null, starts_on: null }, new Date('2026-07-03T12:00:00Z'))
    // The provisional date may be displayed, but only labelled as provisional — it must
    // never present as a configured lock while the database would refuse every save.
    expect(lifecycle.lockConfigured).toBe(false)
    expect(lifecycle.startConfigured).toBe(false)
    expect(lifecycle.locked).toBe(false)
    expect(lifecycle.predictionLockAt).toBe('2028-06-09T19:00:00.000Z')
    expect(lifecycle.provisional).toBe(true)
    expect(lifecycle.source).toBe(TOURNAMENT_LIFECYCLE_SOURCE.CENTRAL_PROVISIONAL)
  })

  it('reports a configured lock and start only when the database carries them', () => {
    const lifecycle = resolveTournamentLifecycle({ prediction_lock_at: '2028-06-09T18:30:00Z', prediction_locked_at: null, starts_on: '2028-06-09' }, new Date('2026-07-03T12:00:00Z'))
    expect(lifecycle.lockConfigured).toBe(true)
    expect(lifecycle.startConfigured).toBe(true)
    expect(lifecycle.provisional).toBe(false)
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

  it('uses the central precise tournament start when staging only has a date', () => {
    const lifecycle = resolveTournamentLifecycle({ prediction_lock_at: null, prediction_locked_at: null, starts_on: '2028-06-09' }, new Date('2026-07-03T12:00:00Z'))
    expect(lifecycle.tournamentStartAt).toBe('2028-06-09T19:00:00.000Z')
  })

  it('starts the tournament at the same moment predictions lock', () => {
    const lifecycle = resolveTournamentLifecycle({ prediction_lock_at: null, prediction_locked_at: null, starts_on: '2028-06-09' }, new Date('2026-07-03T12:00:00Z'))
    expect(lifecycle.tournamentStartAt).toBe(lifecycle.predictionLockAt)
  })

})
