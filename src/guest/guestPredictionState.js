import { GUEST_MATCH_RANGES, GUEST_PREDICTION_CONTEXT, GUEST_PREDICTION_STATE_VERSION, GUEST_RESOLVER_VERSION } from './guestPredictionConfig.js'

function timestamp(value) {
  const date = new Date(value ?? Date.now())
  if (Number.isNaN(date.getTime())) throw new TypeError('A valid timestamp is required')
  return date.toISOString()
}

function isDraftScore(value) {
  return value === null || (Number.isInteger(value) && value >= 0 && value <= 99)
}

function assertMatchNumber(matchNumber, range, label) {
  if (!Number.isInteger(matchNumber) || matchNumber < range.first || matchNumber > range.last) {
    throw new TypeError(`${label} matchNumber must be between ${range.first} and ${range.last}`)
  }
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

function makeBracketRows(reference) {
  return Object.fromEntries(reference.knockoutMatchNumbers.map(matchNumber => [String(matchNumber), {
    matchNumber,
    advancingTeamId: null,
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
    bracketPredictions: makeBracketRows(reference),
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
  if (!isDraftScore(next.homeScore)) throw new TypeError('homeScore must be null or an integer from 0 to 99')
  if (!isDraftScore(next.awayScore)) throw new TypeError('awayScore must be null or an integer from 0 to 99')
  if (typeof next.jokerApplied !== 'boolean') throw new TypeError('jokerApplied must be boolean')

  return incrementState(state, {
    groupPredictions: { ...state.groupPredictions, [String(matchNumber)]: next },
  }, now)
}

export function updateGuestBracketPrediction(state, input, { now } = {}) {
  const matchNumber = Number(input?.matchNumber)
  assertMatchNumber(matchNumber, GUEST_MATCH_RANGES.bracket, 'Bracket')
  const current = state.bracketPredictions?.[String(matchNumber)]
  if (!current) throw new TypeError(`Bracket prediction ${matchNumber} is not part of this guest state`)
  const advancingTeamId = input.advancingTeamId === undefined ? current.advancingTeamId : input.advancingTeamId
  if (advancingTeamId != null && typeof advancingTeamId !== 'string') {
    throw new TypeError('advancingTeamId must be a string or null')
  }

  return incrementState(state, {
    bracketPredictions: {
      ...state.bracketPredictions,
      [String(matchNumber)]: {
        ...current,
        advancingTeamId: advancingTeamId || null,
        updatedAt: timestamp(now),
      },
    },
  }, now)
}

// Compatibility alias for modules that previously called knockout updates.
export const updateGuestKnockoutPrediction = updateGuestBracketPrediction

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
  return updateGuestBracketPrediction(state, {
    matchNumber: numericMatchNumber,
    advancingTeamId: null,
  }, { now })
}

export function replaceGuestPredictions(state, {
  groupPredictions,
  bracketPredictions,
  lastImportedAt = null,
}, { now } = {}) {
  const next = {
    ...state,
    groupPredictions,
    bracketPredictions,
    lastImportedAt,
    revision: state.revision + 1,
    updatedAt: timestamp(now),
  }
  const validation = validateGuestPredictionState(next, {
    tournamentId: state.tournamentId,
    tournamentCode: state.tournamentCode,
    referenceVersion: state.referenceVersion,
  })
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  return next
}

function validateGroupRows(rows) {
  const errors = []
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return ['group predictions must be an object']
  if (Object.values(rows).length !== GUEST_MATCH_RANGES.group.count) errors.push('group predictions must contain 36 rows')
  for (let matchNumber = 1; matchNumber <= 36; matchNumber += 1) {
    const row = rows[String(matchNumber)]
    if (!row || row.matchNumber !== matchNumber) {
      errors.push(`group prediction ${matchNumber} is missing`)
      continue
    }
    if (!isDraftScore(row.homeScore) || !isDraftScore(row.awayScore)) errors.push(`group prediction ${matchNumber} has an invalid score draft`)
    if (typeof row.jokerApplied !== 'boolean') errors.push(`group prediction ${matchNumber} has an invalid joker flag`)
  }
  return errors
}

function validateBracketRows(rows) {
  const errors = []
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return ['bracket predictions must be an object']
  if (Object.values(rows).length !== GUEST_MATCH_RANGES.bracket.count) errors.push('bracket predictions must contain 15 rows')
  for (let matchNumber = 37; matchNumber <= 51; matchNumber += 1) {
    const row = rows[String(matchNumber)]
    if (!row || row.matchNumber !== matchNumber) {
      errors.push(`bracket prediction ${matchNumber} is missing`)
      continue
    }
    if (row.advancingTeamId != null && typeof row.advancingTeamId !== 'string') {
      errors.push(`bracket prediction ${matchNumber} has an invalid advancing team`)
    }
    for (const forbidden of ['homeScore', 'awayScore', 'decisionMethod', 'jokerApplied']) {
      if (Object.hasOwn(row, forbidden)) errors.push(`bracket prediction ${matchNumber} must not store ${forbidden}`)
    }
  }
  return errors
}

export function validateGuestPredictionState(state, reference) {
  const errors = []
  if (!state || typeof state !== 'object') return { valid: false, errors: ['guest state is required'] }
  if (state.version !== GUEST_PREDICTION_STATE_VERSION) errors.push('guest state version is unsupported')
  if (state.context !== GUEST_PREDICTION_CONTEXT) errors.push('guest state context must be guest')
  if (state.resolverVersion !== GUEST_RESOLVER_VERSION) errors.push('This saved prediction file is from an older version. Start a fresh prediction to keep everything accurate.')
  if (state.tournamentId !== reference?.tournamentId) errors.push('guest state tournament does not match the reference')
  if (state.tournamentCode !== reference?.tournamentCode) errors.push('guest state tournament code does not match the reference')
  if (state.referenceVersion !== reference?.referenceVersion) errors.push('guest state reference version does not match')
  if (!Number.isInteger(state.revision) || state.revision < 0) errors.push('guest state revision must be non-negative')
  if (Number.isNaN(Date.parse(state.createdAt)) || Number.isNaN(Date.parse(state.updatedAt))) errors.push('guest state timestamps are invalid')
  errors.push(...validateGroupRows(state.groupPredictions))
  errors.push(...validateBracketRows(state.bracketPredictions))
  return { valid: errors.length === 0, errors }
}

export function upgradeLegacyGuestPredictionState(state, reference) {
  if (!state || state.version !== 'euro28-guest-state-v1') return state
  const next = createGuestPredictionState(reference, { now: state.updatedAt ?? state.createdAt })
  for (let matchNumber = 1; matchNumber <= 36; matchNumber += 1) {
    const row = state.groupPredictions?.[String(matchNumber)]
    if (!row) continue
    next.groupPredictions[String(matchNumber)] = {
      ...next.groupPredictions[String(matchNumber)],
      homeScore: row.homeScore ?? null,
      awayScore: row.awayScore ?? null,
      jokerApplied: Boolean(row.jokerApplied),
      updatedAt: row.updatedAt ?? null,
    }
  }
  for (let matchNumber = 37; matchNumber <= 51; matchNumber += 1) {
    const row = state.knockoutPredictions?.[String(matchNumber)]
    next.bracketPredictions[String(matchNumber)] = {
      matchNumber,
      advancingTeamId: row?.advancingTeamId ?? null,
      updatedAt: row?.updatedAt ?? null,
    }
  }
  return {
    ...next,
    revision: Number.isInteger(state.revision) ? state.revision : 0,
    createdAt: state.createdAt ?? next.createdAt,
    updatedAt: state.updatedAt ?? next.updatedAt,
    lastImportedAt: state.lastImportedAt ?? null,
  }
}
