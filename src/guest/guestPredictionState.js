import { DECISION_METHOD } from '../contracts/resultContract.js'
import {
  GUEST_MATCH_RANGES,
  GUEST_PREDICTION_CONTEXT,
  GUEST_PREDICTION_STATE_VERSION,
  GUEST_RESOLVER_VERSION,
} from './guestPredictionConfig.js'

const DECISION_METHODS = new Set([
  DECISION_METHOD.NORMAL_TIME,
  DECISION_METHOD.EXTRA_TIME,
  DECISION_METHOD.PENALTIES,
])

function timestamp(now) {
  const value = typeof now === 'function' ? now() : now
  const date = value == null ? new Date() : new Date(value)
  if (Number.isNaN(date.getTime())) throw new TypeError('A valid timestamp is required')
  return date.toISOString()
}

function isDraftScore(value) {
  return value == null || (Number.isInteger(value) && value >= 0 && value <= 99)
}

function assertMatchNumber(matchNumber, range, label) {
  if (!Number.isInteger(matchNumber) || matchNumber < range.first || matchNumber > range.last) {
    throw new TypeError(`${label} matchNumber must be between ${range.first} and ${range.last}`)
  }
}

function assertDraftScore(value, label) {
  if (!isDraftScore(value)) throw new TypeError(`${label} must be null or an integer from 0 to 99`)
}

function normaliseOptionalTeamId(value) {
  if (value == null || value === '') return null
  if (typeof value !== 'string') throw new TypeError('advancingTeamId must be a string or null')
  return value
}

function normaliseOptionalDecisionMethod(value) {
  if (value == null || value === '') return null
  if (!DECISION_METHODS.has(value)) {
    throw new TypeError('decisionMethod must be normal_time, extra_time, penalties or null')
  }
  return value
}

function makeGroupRows(reference) {
  return Object.fromEntries(reference.groupMatches.map(match => [String(match.matchNumber), {
    matchNumber: match.matchNumber,
    homeScore: null,
    awayScore: null,
    jokerApplied: false,
    updatedAt: null,
  }]))
}

function makeKnockoutRows(reference) {
  return Object.fromEntries(reference.knockoutMatchNumbers.map(matchNumber => [String(matchNumber), {
    matchNumber,
    homeScore: null,
    awayScore: null,
    advancingTeamId: null,
    decisionMethod: null,
    jokerApplied: false,
    updatedAt: null,
  }]))
}

function incrementState(state, changes, now) {
  return {
    ...state,
    ...changes,
    revision: state.revision + 1,
    updatedAt: timestamp(now),
  }
}

export function createGuestPredictionState(reference, { now } = {}) {
  if (!reference?.tournamentId || !reference?.referenceVersion) {
    throw new TypeError('A valid guest reference model is required')
  }
  const createdAt = timestamp(now)
  return {
    version: GUEST_PREDICTION_STATE_VERSION,
    context: GUEST_PREDICTION_CONTEXT,
    resolverVersion: GUEST_RESOLVER_VERSION,
    tournamentId: reference.tournamentId,
    tournamentCode: reference.tournamentCode,
    referenceVersion: reference.referenceVersion,
    revision: 0,
    createdAt,
    updatedAt: createdAt,
    lastImportedAt: null,
    groupPredictions: makeGroupRows(reference),
    knockoutPredictions: makeKnockoutRows(reference),
  }
}

export function updateGuestGroupPrediction(state, input, { now } = {}) {
  const matchNumber = Number(input?.matchNumber)
  assertMatchNumber(matchNumber, GUEST_MATCH_RANGES.group, 'Group')
  const current = state.groupPredictions?.[String(matchNumber)]
  if (!current) throw new TypeError(`Group prediction ${matchNumber} is not part of this guest state`)

  const next = {
    ...current,
    homeScore: input.homeScore === undefined ? current.homeScore : input.homeScore,
    awayScore: input.awayScore === undefined ? current.awayScore : input.awayScore,
    jokerApplied: input.jokerApplied === undefined ? current.jokerApplied : input.jokerApplied,
    updatedAt: timestamp(now),
  }
  assertDraftScore(next.homeScore, 'homeScore')
  assertDraftScore(next.awayScore, 'awayScore')
  if (typeof next.jokerApplied !== 'boolean') throw new TypeError('jokerApplied must be boolean')

  return incrementState(state, {
    groupPredictions: { ...state.groupPredictions, [String(matchNumber)]: next },
  }, now)
}

export function updateGuestKnockoutPrediction(state, input, { now } = {}) {
  const matchNumber = Number(input?.matchNumber)
  assertMatchNumber(matchNumber, GUEST_MATCH_RANGES.knockout, 'Knockout')
  const current = state.knockoutPredictions?.[String(matchNumber)]
  if (!current) throw new TypeError(`Knockout prediction ${matchNumber} is not part of this guest state`)

  const next = {
    ...current,
    homeScore: input.homeScore === undefined ? current.homeScore : input.homeScore,
    awayScore: input.awayScore === undefined ? current.awayScore : input.awayScore,
    advancingTeamId: input.advancingTeamId === undefined
      ? current.advancingTeamId
      : normaliseOptionalTeamId(input.advancingTeamId),
    decisionMethod: input.decisionMethod === undefined
      ? current.decisionMethod
      : normaliseOptionalDecisionMethod(input.decisionMethod),
    jokerApplied: input.jokerApplied === undefined ? current.jokerApplied : input.jokerApplied,
    updatedAt: timestamp(now),
  }
  assertDraftScore(next.homeScore, 'homeScore')
  assertDraftScore(next.awayScore, 'awayScore')
  if (typeof next.jokerApplied !== 'boolean') throw new TypeError('jokerApplied must be boolean')

  return incrementState(state, {
    knockoutPredictions: { ...state.knockoutPredictions, [String(matchNumber)]: next },
  }, now)
}

export function clearGuestPrediction(state, matchNumber, { now } = {}) {
  const numericMatchNumber = Number(matchNumber)
  if (numericMatchNumber <= GUEST_MATCH_RANGES.group.last) {
    return updateGuestGroupPrediction(state, {
      matchNumber: numericMatchNumber,
      homeScore: null,
      awayScore: null,
      jokerApplied: false,
    }, { now })
  }
  return updateGuestKnockoutPrediction(state, {
    matchNumber: numericMatchNumber,
    homeScore: null,
    awayScore: null,
    advancingTeamId: null,
    decisionMethod: null,
    jokerApplied: false,
  }, { now })
}

export function replaceGuestPredictions(state, {
  groupPredictions,
  knockoutPredictions,
  lastImportedAt = null,
}, { now } = {}) {
  const next = {
    ...state,
    groupPredictions,
    knockoutPredictions,
    lastImportedAt,
    revision: state.revision + 1,
    updatedAt: timestamp(now),
  }
  const validation = validateGuestPredictionState(next, {
    tournamentId: state.tournamentId,
    tournamentCode: state.tournamentCode,
    referenceVersion: state.referenceVersion,
    groupMatches: Object.values(groupPredictions),
    knockoutMatchNumbers: Object.values(knockoutPredictions).map(row => row.matchNumber),
  })
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  return next
}

function validateRowSet(rows, range, type) {
  const errors = []
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return [`${type} predictions must be an object`]
  const values = Object.values(rows)
  if (values.length !== range.count) errors.push(`${type} predictions must contain ${range.count} rows`)
  for (let matchNumber = range.first; matchNumber <= range.last; matchNumber += 1) {
    const row = rows[String(matchNumber)]
    if (!row || row.matchNumber !== matchNumber) {
      errors.push(`${type} prediction ${matchNumber} is missing`)
      continue
    }
    if (!isDraftScore(row.homeScore) || !isDraftScore(row.awayScore)) {
      errors.push(`${type} prediction ${matchNumber} has an invalid score draft`)
    }
    if (typeof row.jokerApplied !== 'boolean') errors.push(`${type} prediction ${matchNumber} has an invalid joker flag`)
    if (type === 'knockout') {
      if (row.advancingTeamId != null && typeof row.advancingTeamId !== 'string') {
        errors.push(`knockout prediction ${matchNumber} has an invalid advancing team`)
      }
      if (row.decisionMethod != null && !DECISION_METHODS.has(row.decisionMethod)) {
        errors.push(`knockout prediction ${matchNumber} has an invalid decision method`)
      }
    }
  }
  return errors
}

export function validateGuestPredictionState(state, reference) {
  const errors = []
  if (!state || typeof state !== 'object') return { valid: false, errors: ['guest state is required'] }
  if (state.version !== GUEST_PREDICTION_STATE_VERSION) errors.push('guest state version is unsupported')
  if (state.context !== GUEST_PREDICTION_CONTEXT) errors.push('guest state context must be guest')
  if (state.resolverVersion !== GUEST_RESOLVER_VERSION) errors.push('guest state resolver version is unsupported')
  if (state.tournamentId !== reference?.tournamentId) errors.push('guest state tournament does not match the reference')
  if (state.tournamentCode !== reference?.tournamentCode) errors.push('guest state tournament code does not match the reference')
  if (state.referenceVersion !== reference?.referenceVersion) errors.push('guest state reference version does not match')
  if (!Number.isInteger(state.revision) || state.revision < 0) errors.push('guest state revision must be non-negative')
  if (Number.isNaN(Date.parse(state.createdAt)) || Number.isNaN(Date.parse(state.updatedAt))) {
    errors.push('guest state timestamps are invalid')
  }
  errors.push(...validateRowSet(state.groupPredictions, GUEST_MATCH_RANGES.group, 'group'))
  errors.push(...validateRowSet(state.knockoutPredictions, GUEST_MATCH_RANGES.knockout, 'knockout'))
  return { valid: errors.length === 0, errors }
}
