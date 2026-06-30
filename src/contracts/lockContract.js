export const PREDICTION_LOCK_STATE = Object.freeze({
  UNCONFIGURED: 'unconfigured',
  OPEN: 'open',
  LOCKED: 'locked',
})

function parseInstant(value, label) {
  if (value == null || value === '') return null
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`${label} must be a valid date`)
  }
  return date
}

/**
 * Resolve the single Euro 2028 prediction lock.
 *
 * The opening-match kick-off is the only scheduled lock. A persisted lock is
 * monotonic: once the server records it, later fixture edits cannot reopen
 * predictions accidentally.
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

export function canEditPredictions(lockInput) {
  return resolvePredictionLock(lockInput).canEdit
}

export function canRevealOtherPredictions(lockInput) {
  return resolvePredictionLock(lockInput).canReveal
}
