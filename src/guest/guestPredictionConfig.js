import { EURO28_RESOLVER_VERSION, RESOLVER_CONTEXT } from '../resolver/index.js'

export const GUEST_PREDICTION_STATE_VERSION = 'euro28-guest-state-v1'
export const GUEST_PREDICTION_BUNDLE_FORMAT = 'euro28-guest-prediction-bundle'
export const GUEST_PREDICTION_BUNDLE_VERSION = 1
export const GUEST_REFERENCE_MODEL_VERSION = 'euro28-guest-reference-v1'
export const GUEST_STORAGE_KEY_PREFIX = 'euro28:guest-predictions'
export const GUEST_BUNDLE_MAX_BYTES = 512_000

export const GUEST_PREDICTION_CONTEXT = RESOLVER_CONTEXT.GUEST
export const GUEST_RESOLVER_VERSION = EURO28_RESOLVER_VERSION

export const GUEST_MATCH_RANGES = Object.freeze({
  group: Object.freeze({ first: 1, last: 36, count: 36 }),
  knockout: Object.freeze({ first: 37, last: 51, count: 15 }),
  total: 51,
})

export function buildGuestStorageKey(reference) {
  const tournamentId = reference?.tournamentId
  const referenceVersion = reference?.referenceVersion
  if (!tournamentId || !referenceVersion) {
    throw new TypeError('Guest storage requires a tournamentId and referenceVersion')
  }
  return `${GUEST_STORAGE_KEY_PREFIX}:${tournamentId}:${referenceVersion}`
}
