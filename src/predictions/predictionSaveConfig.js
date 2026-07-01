export const EURO28_PREDICTION_SAVE_VERSION = 'euro28-original-predictor-save-v2'
export const EURO28_PREDICTION_SAVE_RPC = 'save_my_prediction_bundle'
export const GUEST_STATE_UPDATED_EVENT = 'euro28:guest-state-updated'

export const PREDICTION_SAVE_SOURCE = Object.freeze({
  ACCOUNT: 'account',
  GUEST_IMPORT: 'guest_import',
})

export const PREDICTION_SAVE_LIMITS = Object.freeze({
  groupMatches: 36,
  bracketMatches: 15,
  totalRows: 51,
  groupJokers: 5,
  bracketJokers: 0,
  minimumRevision: 0,
})
