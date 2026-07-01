export const PREDICTION_LOCK_STATE = Object.freeze({
  UNCONFIGURED: 'unconfigured',
  OPEN: 'open',
  LOCKED: 'locked',
})

function parseInstant(value, label) {
  if (value == null || value === '') return null
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new TypeError(`${label} must be a valid date`)
  return date
}

/**
 * Resolve the global Euro 2028 prediction-content lock.
 *
 * Score predictions, group outcomes and knockout selections lock at the first
 * tournament kick-off. A persisted lock remains monotonic if fixture data is
 * corrected later.
 */
export function resolvePredictionLock({
  now = new Date(),
  openingKickoffAt = null,
  persistedLockedAt = null,
} = {}) {
  const current = parseInstant(now, 'now')
  const persisted = parseInstant(persistedLockedAt, 'persistedLockedAt')
  const scheduled = parseInstant(openingKickoffAt, 'openingKickoffAt')

  if (persisted) {
    return Object.freeze({
      state: PREDICTION_LOCK_STATE.LOCKED,
      canEdit: false,
      canReveal: true,
      effectiveLockAt: persisted,
      reason: 'persisted_lock',
    })
  }

  if (!scheduled) {
    return Object.freeze({
      state: PREDICTION_LOCK_STATE.UNCONFIGURED,
      canEdit: false,
      canReveal: false,
      effectiveLockAt: null,
      reason: 'opening_kickoff_unconfirmed',
    })
  }

  if (current.getTime() < scheduled.getTime()) {
    return Object.freeze({
      state: PREDICTION_LOCK_STATE.OPEN,
      canEdit: true,
      canReveal: false,
      effectiveLockAt: scheduled,
      reason: 'before_opening_kickoff',
    })
  }

  return Object.freeze({
    state: PREDICTION_LOCK_STATE.LOCKED,
    canEdit: false,
    canReveal: true,
    effectiveLockAt: scheduled,
    reason: 'opening_kickoff_reached',
  })
}

/**
 * Joker placement has a separate lock: it may be moved only while the target
 * match has not kicked off. This remains true after the global content lock.
 */
export function canEditJoker({ now = new Date(), matchKickoffAt = null } = {}) {
  const current = parseInstant(now, 'now')
  const kickoff = parseInstant(matchKickoffAt, 'matchKickoffAt')
  if (!kickoff) return false
  return current.getTime() < kickoff.getTime()
}

/**
 * An exceptional grace window never reopens the tournament globally. It can
 * permit one user's content edit for one specific match only while both the
 * grant and the match remain unexpired/unstarted.
 */
export function canUsePredictionGrace({
  now = new Date(),
  matchKickoffAt = null,
  graceExpiresAt = null,
} = {}) {
  const current = parseInstant(now, 'now')
  const kickoff = parseInstant(matchKickoffAt, 'matchKickoffAt')
  const expires = parseInstant(graceExpiresAt, 'graceExpiresAt')
  if (!kickoff || !expires) return false
  return current.getTime() < kickoff.getTime() && current.getTime() < expires.getTime()
}

export function canEditPredictions(lockInput) {
  return resolvePredictionLock(lockInput).canEdit
}

export function canRevealOtherPredictions(lockInput) {
  return resolvePredictionLock(lockInput).canReveal
}
