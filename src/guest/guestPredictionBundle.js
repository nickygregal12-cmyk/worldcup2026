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
    if (new TextEncoder().encode(input).length > GUEST_BUNDLE_MAX_BYTES) throw new TypeError('Guest prediction bundle is too large')
    try { return JSON.parse(input) } catch { throw new TypeError('Guest prediction bundle is not valid JSON') }
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Guest prediction bundle must be a JSON object')
  return input
}

function groupRowsToObject(rows) {
  if (!Array.isArray(rows) || rows.length !== GUEST_MATCH_RANGES.group.count) throw new TypeError('group bundle rows must contain 36 matches')
  const result = {}
  for (const row of rows) {
    const matchNumber = Number(row?.matchNumber)
    if (!Number.isInteger(matchNumber) || matchNumber < 1 || matchNumber > 36 || result[String(matchNumber)]) {
      throw new TypeError('group bundle contains an invalid or duplicate match number')
    }
    result[String(matchNumber)] = {
      matchNumber,
      homeScore: row.homeScore ?? null,
      awayScore: row.awayScore ?? null,
      jokerApplied: row.jokerApplied ?? false,
      updatedAt: null,
    }
  }
  return result
}

function bracketRowsToObject(rows) {
  if (!Array.isArray(rows) || rows.length !== GUEST_MATCH_RANGES.bracket.count) throw new TypeError('bracket bundle rows must contain 15 matches')
  const result = {}
  for (const row of rows) {
    const matchNumber = Number(row?.matchNumber)
    if (!Number.isInteger(matchNumber) || matchNumber < 37 || matchNumber > 51 || result[String(matchNumber)]) {
      throw new TypeError('bracket bundle contains an invalid or duplicate match number')
    }
    result[String(matchNumber)] = {
      matchNumber,
      advancingTeamId: row.advancingTeamId ?? null,
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
    competition: 'original',
    predictions: {
      group: Object.values(state.groupPredictions).map(row => ({
        matchNumber: row.matchNumber,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        jokerApplied: row.jokerApplied,
      })),
      bracket: Object.values(state.bracketPredictions).map(row => ({
        matchNumber: row.matchNumber,
        advancingTeamId: row.advancingTeamId,
      })),
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
  if (bundle.context !== GUEST_PREDICTION_CONTEXT || bundle.competition !== 'original') throw new TypeError('Only original guest prediction bundles can be imported')
  if (bundle.stateVersion !== GUEST_PREDICTION_STATE_VERSION) throw new TypeError('Guest state version is unsupported')
  if (bundle.resolverVersion !== GUEST_RESOLVER_VERSION) throw new TypeError('This saved prediction file is from an older version. Start a fresh prediction to keep everything accurate.')
  if (bundle.tournament?.id !== reference.tournamentId || bundle.tournament?.code !== reference.tournamentCode) throw new TypeError('Guest bundle belongs to a different tournament')
  if (bundle.tournament?.referenceVersion !== reference.referenceVersion) throw new TypeError('Guest bundle uses a different tournament reference version')

  const groupPredictions = groupRowsToObject(bundle.predictions?.group)
  const bracketPredictions = bracketRowsToObject(bundle.predictions?.bracket)
  const importedAt = nowIso(now)
  const base = currentState ?? createGuestPredictionState(reference, { now: importedAt })
  const next = replaceGuestPredictions(base, { groupPredictions, bracketPredictions, lastImportedAt: importedAt }, { now: importedAt })
  const validation = validateGuestPredictionState(next, reference)
  if (!validation.valid) throw new TypeError(validation.errors.join('; '))
  return next
}

export function buildGuestBundleFilename(reference) {
  return `${reference.tournamentCode}-original-predictor-v${GUEST_PREDICTION_BUNDLE_VERSION}.json`
}
