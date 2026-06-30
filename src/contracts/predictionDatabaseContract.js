import { PREDICTION_LOCK_STATE, resolvePredictionLock } from './lockContract.js'

export const EURO_PREDICTION_DATABASE_CONTRACT_VERSION = 'euro28-prediction-db-v1'

export const PREDICTION_DATABASE_TABLES = Object.freeze({
  SCORING_RULESETS: 'scoring_rulesets',
  PREDICTION_SETS: 'prediction_sets',
  MATCH_PREDICTIONS: 'match_predictions',
})

export const PREDICTION_DATABASE_SCOPE = Object.freeze({
  activeMigrationCountBeforeImplementation: 4,
  plannedMigrationNumber: '005',
  createsAuthenticationUi: false,
  createsProfiles: false,
  createsLeagues: false,
  createsScoredPoints: false,
  createsAdminCorrectionTools: false,
  createsBrowserTableWrites: false,
  plannedTables: Object.freeze(Object.values(PREDICTION_DATABASE_TABLES)),
  tournamentColumns: Object.freeze([
    'active_scoring_ruleset_id',
    'prediction_contract_version',
    'prediction_locked_at',
  ]),
})

export const SCORING_RULE_CODES = Object.freeze([
  'match_exact_score',
  'match_correct_outcome',
  'knockout_correct_advancing_team',
  'knockout_correct_decision_method',
  'bracket_round_of_16',
  'bracket_quarter_final',
  'bracket_semi_final',
  'bracket_final',
  'bracket_champion',
])

export const PREDICTION_SET_COLUMNS = Object.freeze([
  'id',
  'tournament_id',
  'user_id',
  'contract_version',
  'scoring_ruleset_id',
  'revision',
  'created_at',
  'updated_at',
])

export const MATCH_PREDICTION_COLUMNS = Object.freeze([
  'id',
  'prediction_set_id',
  'tournament_id',
  'match_id',
  'predicted_home_tournament_team_id',
  'predicted_away_tournament_team_id',
  'home_score_90',
  'away_score_90',
  'advancing_tournament_team_id',
  'decision_method',
  'created_at',
  'updated_at',
])

export const PREDICTION_WRITE_MODEL = Object.freeze({
  mode: 'atomic_bundle',
  directBrowserTableWrites: false,
  expectedRevisionRequired: true,
  databaseTimeAuthoritative: true,
  serverControlsOwnership: true,
  serverControlsTimestamps: true,
  validatesWholeBracketPath: true,
  deletesOmittedDraftRowsBeforeLock: true,
  implementationMigration: '006_or_later',
})

export const PREDICTION_VISIBILITY_MODEL = Object.freeze({
  anonymousAccess: false,
  ownerCanReadBeforeLock: true,
  otherAuthenticatedUsersCanReadBeforeLock: false,
  authenticatedUsersCanReadAfterLock: true,
  rawWritesGrantedToAuthenticated: false,
})

export const PREDICTION_COMPLETION_MODEL = Object.freeze({
  explicitSubmitRequired: false,
  savesAreDraftsUntilGlobalLock: true,
  completenessIsDerived: true,
  incompleteRowsMayRemainAtLock: true,
})

export const DATABASE_SCORING_MODEL = Object.freeze({
  versionedRows: true,
  statusValues: Object.freeze(['provisional', 'locked', 'retired']),
  activeRulesetReferencedByTournament: true,
  predictionSetPinsRuleset: true,
  numericValuesStoredOnRulesetOnly: true,
  lockedRulesetsImmutable: true,
  pointValuesCopiedIntoPredictionRows: false,
})

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isGoal(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

/**
 * Database-facing access model. The database clock and persisted lock are
 * authoritative. A missing scheduled lock fails closed.
 */
export function resolvePredictionDatabaseAccess({
  userId,
  ownerId,
  now = new Date(),
  scheduledLockAt = null,
  persistedLockedAt = null,
} = {}) {
  const authenticated = nonEmptyString(userId)
  const owner = authenticated && userId === ownerId
  const lock = resolvePredictionLock({
    now,
    openingKickoffAt: scheduledLockAt,
    persistedLockedAt,
  })

  return Object.freeze({
    lockState: lock.state,
    canRead: owner || (authenticated && lock.canReveal),
    canMutate: owner && lock.canEdit,
    revealToAuthenticated: authenticated && lock.canReveal,
    failClosed: lock.state === PREDICTION_LOCK_STATE.UNCONFIGURED,
  })
}

/**
 * Shape-only validation for the future atomic bundle endpoint. Canonical
 * participant and bracket-path validation remains a trusted server concern.
 */
export function validatePredictionBundleShape(bundle) {
  const errors = []
  if (!bundle || typeof bundle !== 'object') {
    return { valid: false, errors: ['bundle is required'] }
  }
  if (!nonEmptyString(bundle.tournament_id)) errors.push('tournament_id is required')
  if (!Number.isInteger(bundle.expected_revision) || bundle.expected_revision < 0) {
    errors.push('expected_revision must be a non-negative integer')
  }
  if (!Array.isArray(bundle.matches)) {
    errors.push('matches must be an array')
    return { valid: false, errors }
  }

  const seenMatchIds = new Set()
  bundle.matches.forEach((prediction, index) => {
    const prefix = `matches[${index}]`
    if (!prediction || typeof prediction !== 'object') {
      errors.push(`${prefix} must be an object`)
      return
    }
    if (!nonEmptyString(prediction.match_id)) errors.push(`${prefix}.match_id is required`)
    else if (seenMatchIds.has(prediction.match_id)) errors.push(`${prefix}.match_id is duplicated`)
    else seenMatchIds.add(prediction.match_id)

    if (!nonEmptyString(prediction.predicted_home_tournament_team_id)) {
      errors.push(`${prefix}.predicted_home_tournament_team_id is required`)
    }
    if (!nonEmptyString(prediction.predicted_away_tournament_team_id)) {
      errors.push(`${prefix}.predicted_away_tournament_team_id is required`)
    }
    if (prediction.predicted_home_tournament_team_id === prediction.predicted_away_tournament_team_id) {
      errors.push(`${prefix} must contain two different predicted participants`)
    }
    if (!isGoal(prediction.home_score_90)) errors.push(`${prefix}.home_score_90 must be an integer from 0 to 99`)
    if (!isGoal(prediction.away_score_90)) errors.push(`${prefix}.away_score_90 must be an integer from 0 to 99`)
  })

  return { valid: errors.length === 0, errors }
}

export function validatePredictionDatabaseContract() {
  const errors = []
  if (PREDICTION_DATABASE_SCOPE.createsBrowserTableWrites) {
    errors.push('Migration 005 must not enable direct browser table writes')
  }
  if (PREDICTION_WRITE_MODEL.mode !== 'atomic_bundle') {
    errors.push('prediction writes must use one atomic bundle')
  }
  if (!PREDICTION_WRITE_MODEL.expectedRevisionRequired) {
    errors.push('prediction writes must reject stale revisions')
  }
  if (!PREDICTION_WRITE_MODEL.databaseTimeAuthoritative) {
    errors.push('the database clock must be authoritative')
  }
  if (!DATABASE_SCORING_MODEL.lockedRulesetsImmutable) {
    errors.push('locked scoring rulesets must be immutable')
  }
  if (DATABASE_SCORING_MODEL.pointValuesCopiedIntoPredictionRows) {
    errors.push('prediction rows must not copy scoring point values')
  }
  if (PREDICTION_VISIBILITY_MODEL.otherAuthenticatedUsersCanReadBeforeLock) {
    errors.push('other users must not see predictions before the global lock')
  }
  if (!PREDICTION_VISIBILITY_MODEL.authenticatedUsersCanReadAfterLock) {
    errors.push('authenticated users must be able to view predictions after the global lock')
  }
  if (new Set(SCORING_RULE_CODES).size !== SCORING_RULE_CODES.length) {
    errors.push('scoring rule codes must be unique')
  }
  return { valid: errors.length === 0, errors }
}
