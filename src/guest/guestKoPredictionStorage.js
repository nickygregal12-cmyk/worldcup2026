import { KO_PREDICTOR_JOKER_CAP } from '../koPredictor/koPredictorConfig.js'
import {
  buildKoPredictorRows,
  createKoPredictorDraft,
  summariseKoPredictor,
  updateKoPredictorDraft,
} from '../koPredictor/koPredictorModel.js'

export const GUEST_KO_PREDICTION_STATE_VERSION = 'euro28-guest-ko-state-v1'
export const GUEST_KO_STORAGE_KEY_PREFIX = 'euro28:guest-ko-predictions'

function timestamp(value) {
  const date = new Date(value ?? Date.now())
  if (Number.isNaN(date.getTime())) throw new TypeError('A valid guest KO timestamp is required')
  return date.toISOString()
}

function isDraftScore(value) {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= 99)
}

function storageAvailable(storage) {
  return storage &&
    typeof storage.getItem === 'function' &&
    typeof storage.setItem === 'function' &&
    typeof storage.removeItem === 'function'
}

export function buildGuestKoStorageKey(reference) {
  if (!reference?.tournamentId || !reference?.referenceVersion) {
    throw new TypeError('Guest KO storage requires a tournamentId and referenceVersion')
  }
  return `${GUEST_KO_STORAGE_KEY_PREFIX}:${reference.tournamentId}:${reference.referenceVersion}`
}

export function createGuestKoPredictionState(reference, { now } = {}) {
  const createdAt = timestamp(now)
  const draft = createKoPredictorDraft(reference)
  return {
    version: GUEST_KO_PREDICTION_STATE_VERSION,
    tournamentId: reference.tournamentId,
    referenceVersion: reference.referenceVersion,
    revision: 0,
    createdAt,
    updatedAt: createdAt,
    rows: draft.rows,
  }
}

export function validateGuestKoPredictionState(state, reference) {
  const errors = []
  if (!state || typeof state !== 'object') return { valid: false, errors: ['guest KO state is required'] }
  if (state.version !== GUEST_KO_PREDICTION_STATE_VERSION) errors.push('guest KO state version is unsupported')
  if (state.tournamentId !== reference?.tournamentId) errors.push('guest KO tournament does not match the reference')
  if (state.referenceVersion !== reference?.referenceVersion) errors.push('guest KO reference version does not match')
  if (!Number.isInteger(state.revision) || state.revision < 0) errors.push('guest KO revision must be non-negative')
  if (Number.isNaN(Date.parse(state.createdAt)) || Number.isNaN(Date.parse(state.updatedAt))) errors.push('guest KO timestamps are invalid')
  if (!state.rows || typeof state.rows !== 'object' || Array.isArray(state.rows)) {
    errors.push('guest KO rows must be an object')
    return { valid: false, errors }
  }

  if (Object.keys(state.rows).length !== reference.knockoutMatches.length) {
    errors.push('guest KO rows must contain all knockout matches')
  }

  let jokerCount = 0
  for (const match of reference.knockoutMatches) {
    const row = state.rows[String(match.matchNumber)]
    if (!row || row.matchNumber !== match.matchNumber) {
      errors.push(`guest KO prediction ${match.matchNumber} is missing`)
      continue
    }
    if (!isDraftScore(row.homeScore) || !isDraftScore(row.awayScore)) errors.push(`guest KO prediction ${match.matchNumber} has an invalid score`)
    if (row.advancingTeamId != null && typeof row.advancingTeamId !== 'string') errors.push(`guest KO prediction ${match.matchNumber} has an invalid advancing team`)
    if (row.decisionMethod != null && !['normal_time', 'extra_time', 'penalties'].includes(row.decisionMethod)) errors.push(`guest KO prediction ${match.matchNumber} has an invalid method`)
    if (typeof row.jokerApplied !== 'boolean') errors.push(`guest KO prediction ${match.matchNumber} has an invalid joker flag`)
    if (row.jokerApplied) jokerCount += 1
  }
  if (jokerCount > KO_PREDICTOR_JOKER_CAP) errors.push(`guest KO state exceeds the ${KO_PREDICTOR_JOKER_CAP}-joker cap`)

  if (errors.length === 0) {
    try {
      buildKoPredictorRows(reference, state)
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }
  return { valid: errors.length === 0, errors }
}

export function updateGuestKoPredictionState(state, reference, match, patch, { now } = {}) {
  const nextDraft = updateKoPredictorDraft(state, match, patch)
  const next = {
    ...state,
    revision: state.revision + 1,
    updatedAt: timestamp(now),
    rows: nextDraft.rows,
  }
  const validation = validateGuestKoPredictionState(next, reference)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  return next
}

export function summariseGuestKoPredictionState(reference, state) {
  const validation = validateGuestKoPredictionState(state, reference)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  return summariseKoPredictor(reference, state)
}

export function createGuestKoPredictionStorage({ storage, reference }) {
  const key = buildGuestKoStorageKey(reference)
  if (!storageAvailable(storage)) {
    return {
      key,
      available: false,
      load: () => ({ status: 'unavailable', state: null, error: 'Browser storage is unavailable.' }),
      save: () => ({ status: 'unavailable', error: 'Browser storage is unavailable.' }),
      clear: () => ({ status: 'unavailable', error: 'Browser storage is unavailable.' }),
    }
  }

  return {
    key,
    available: true,
    load() {
      try {
        const raw = storage.getItem(key)
        if (!raw) return { status: 'empty', state: null, error: null }
        const state = JSON.parse(raw)
        const validation = validateGuestKoPredictionState(state, reference)
        if (!validation.valid) return { status: 'invalid', state: null, error: validation.errors.join('; ') }
        return { status: 'ready', state, error: null }
      } catch (error) {
        return { status: 'invalid', state: null, error: error instanceof Error ? error.message : String(error) }
      }
    },
    save(state) {
      const validation = validateGuestKoPredictionState(state, reference)
      if (!validation.valid) return { status: 'invalid', error: validation.errors.join('; ') }
      try {
        storage.setItem(key, JSON.stringify(state))
        return { status: 'saved', error: null }
      } catch (error) {
        return { status: 'error', error: error instanceof Error ? error.message : String(error) }
      }
    },
    clear() {
      try {
        storage.removeItem(key)
        return { status: 'cleared', error: null }
      } catch (error) {
        return { status: 'error', error: error instanceof Error ? error.message : String(error) }
      }
    },
  }
}
