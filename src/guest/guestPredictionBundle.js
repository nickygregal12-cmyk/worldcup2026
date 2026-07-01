import {
  GUEST_BUNDLE_MAX_BYTES,
  GUEST_MATCH_RANGES,
  GUEST_PREDICTION_BUNDLE_FORMAT,
  GUEST_PREDICTION_BUNDLE_VERSION,
  GUEST_PREDICTION_CONTEXT,
  GUEST_PREDICTION_STATE_VERSION,
  GUEST_RESOLVER_VERSION,
} from './guestPredictionConfig.js'
import {
  createGuestPredictionState,
  replaceGuestPredictions,
  validateGuestPredictionState,
} from './guestPredictionState.js'

function nowIso(now) {
  const date = new Date(typeof now === 'function' ? now() : (now ?? Date.now()))
  if (Number.isNaN(date.getTime())) throw new TypeError('A valid export timestamp is required')
  return date.toISOString()
}

function parseInput(input) {
  if (typeof input === 'string') {
    if (new TextEncoder().encode(input).length > GUEST_BUNDLE_MAX_BYTES) {
      throw new TypeError('Guest prediction bundle is too large')
    }
    try {
      return JSON.parse(input)
    } catch {
      throw new TypeError('Guest prediction bundle is not valid JSON')
    }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Guest prediction bundle must be a JSON object')
  }
  return input
}

function cloneGroupRows(rows) {
  return rows.map(row => ({
    matchNumber: row.matchNumber,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    jokerApplied: row.jokerApplied,
  }))
}

function cloneKnockoutRows(rows) {
  return rows.map(row => ({
    matchNumber: row.matchNumber,
    homeScore: row.homeScore,
    awayScore: row.awayScore,
    advancingTeamId: row.advancingTeamId,
    decisionMethod: row.decisionMethod,
    jokerApplied: row.jokerApplied,
  }))
}

function rowsToObject(rows, range, type) {
  if (!Array.isArray(rows) || rows.length !== range.count) {
    throw new TypeError(`${type} bundle rows must contain ${range.count} matches`)
  }
  const result = {}
  for (const row of rows) {
    const matchNumber = Number(row?.matchNumber)
    if (!Number.isInteger(matchNumber) || matchNumber < range.first || matchNumber > range.last) {
      throw new TypeError(`${type} bundle contains an invalid match number`)
    }
    if (result[String(matchNumber)]) throw new TypeError(`${type} bundle contains duplicate match ${matchNumber}`)
    result[String(matchNumber)] = type === 'group'
      ? {
          matchNumber,
          homeScore: row.homeScore ?? null,
          awayScore: row.awayScore ?? null,
          jokerApplied: row.jokerApplied ?? false,
          updatedAt: null,
        }
      : {
          matchNumber,
          homeScore: row.homeScore ?? null,
          awayScore: row.awayScore ?? null,
          advancingTeamId: row.advancingTeamId ?? null,
          decisionMethod: row.decisionMethod ?? null,
          jokerApplied: row.jokerApplied ?? false,
          updatedAt: null,
        }
  }
  return result
}

export function createGuestPredictionBundle(state, reference, { now } = {}) {
  const validation = validateGuestPredictionState(state, reference)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))

  return {
    format: GUEST_PREDICTION_BUNDLE_FORMAT,
    version: GUEST_PREDICTION_BUNDLE_VERSION,
    exportedAt: nowIso(now),
    context: GUEST_PREDICTION_CONTEXT,
    stateVersion: GUEST_PREDICTION_STATE_VERSION,
    resolverVersion: GUEST_RESOLVER_VERSION,
    tournament: {
      id: reference.tournamentId,
      code: reference.tournamentCode,
      referenceVersion: reference.referenceVersion,
    },
    sourceRevision: state.revision,
    predictions: {
      group: cloneGroupRows(Object.values(state.groupPredictions)),
      knockout: cloneKnockoutRows(Object.values(state.knockoutPredictions)),
    },
  }
}

export function serialiseGuestPredictionBundle(state, reference, options) {
  return `${JSON.stringify(createGuestPredictionBundle(state, reference, options), null, 2)}\n`
}

export function importGuestPredictionBundle(input, reference, currentState, { now } = {}) {
  const bundle = parseInput(input)
  if (bundle.format !== GUEST_PREDICTION_BUNDLE_FORMAT) throw new TypeError('Guest prediction bundle format is unsupported')
  if (bundle.version !== GUEST_PREDICTION_BUNDLE_VERSION) throw new TypeError('Guest prediction bundle version is unsupported')
  if (bundle.context !== GUEST_PREDICTION_CONTEXT) throw new TypeError('Only guest prediction bundles can be imported')
  if (bundle.stateVersion !== GUEST_PREDICTION_STATE_VERSION) throw new TypeError('Guest state version is unsupported')
  if (bundle.resolverVersion !== GUEST_RESOLVER_VERSION) throw new TypeError('Guest bundle resolver version is unsupported')
  if (bundle.tournament?.id !== reference.tournamentId || bundle.tournament?.code !== reference.tournamentCode) {
    throw new TypeError('Guest bundle belongs to a different tournament')
  }
  if (bundle.tournament?.referenceVersion !== reference.referenceVersion) {
    throw new TypeError('Guest bundle uses a different tournament reference version')
  }

  const groupPredictions = rowsToObject(bundle.predictions?.group, GUEST_MATCH_RANGES.group, 'group')
  const knockoutPredictions = rowsToObject(bundle.predictions?.knockout, GUEST_MATCH_RANGES.knockout, 'knockout')
  const importedAt = nowIso(now)
  const base = currentState ?? createGuestPredictionState(reference, { now: importedAt })
  const next = replaceGuestPredictions(base, {
    groupPredictions,
    knockoutPredictions,
    lastImportedAt: importedAt,
  }, { now: importedAt })

  const validation = validateGuestPredictionState(next, reference)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  return next
}

export function buildGuestBundleFilename(reference) {
  return `${reference.tournamentCode}-guest-predictions-v${GUEST_PREDICTION_BUNDLE_VERSION}.json`
}
