export const EURO28_PREDICTION_JOURNEY_VERSION = 'euro28-prediction-journey-v2'

export const PREDICTION_JOURNEY_VIEW = Object.freeze({
  GROUPS: 'groups',
  BRACKET: 'bracket',
  REVIEW: 'review',
})

export const PREDICTION_JOURNEY_CONTEXT = Object.freeze({
  GUEST: 'guest',
  ACCOUNT: 'account',
})

export const PREDICTION_AUTOSAVE_STATE = Object.freeze({
  LOCAL: 'local',
  IDLE: 'idle',
  DIRTY: 'dirty',
  SAVING: 'saving',
  SAVED: 'saved',
  ERROR: 'error',
  CONFLICT: 'conflict',
  LOCKED: 'locked',
})

export const PREDICTION_AUTOSAVE_DELAY_MS = 800
export const GUEST_REVIEW_STORAGE_PREFIX = 'euro28:guest-review'
