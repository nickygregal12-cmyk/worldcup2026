import {
  PREDICTION_LOCK_STATE,
  canEditJoker,
  canUsePredictionGrace,
  resolvePredictionLock,
} from './lockContract.js'

export const EURO_PREDICTION_DATABASE_CONTRACT_VERSION = 'euro28-prediction-db-v2'

export const PREDICTION_DATABASE_TABLES = Object.freeze({
  SCORING_RULESETS: 'scoring_rulesets',
  PREDICTION_SETS: 'prediction_sets',
  MATCH_PREDICTIONS: 'match_predictions',
  PREDICTION_GRACE_WINDOWS: 'prediction_grace_windows',
})

export const PREDICTION_DATABASE_SCOPE = Object.freeze({
  activeMigrationCountAfterImplementation: 5,
  migrationNumber: '005',
  migrationFilename: '202607010005_euro28_prediction_storage.sql',
  implementationStatus: 'storage_foundation_implemented',
  createsAuthenticationUi: false,
  createsProfiles: false,
  createsLeagues: false,
  createsScoredPoints: false,
  createsAdminCorrectionTools: false,
  createsBrowserTableWrites: false,
  createsFinalSaveRpc: false,
  createsGuestServerStorage: false,
  createdTables: Object.freeze(Object.values(PREDICTION_DATABASE_TABLES)),
  tournamentColumns: Object.freeze([
    'active_scoring_ruleset_id',
    'prediction_contract_version',
    'prediction_locked_at',
  ]),
})

export const ATOMIC_PREDICTION_SAVE_SCOPE = Object.freeze({
  activeMigrationCountAfterImplementation: 9,
  migrationNumber: '009',
  migrationFilename: '202607010009_euro28_atomic_prediction_save.sql',
  implementationStatus: 'trusted_atomic_save_implemented',
  rpcName: 'save_my_prediction_bundle',
  authenticatedExecuteOnly: true,
  directBrowserTableWrites: false,
  supportsGuestImport: true,
  guestImportRequiresCompleteBundle: true,
  guestImportOverwritesAccountRows: false,
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
  'joker_multiplier',
  'joker_group_stage_cap',
  'joker_knockout_cap',
])

export const SCORING_RULESET_COLUMNS = Object.freeze([
  'id',
  'tournament_id',
  'ruleset_key',
  'version',
  'status',
  'match_exact_score_points',
  'match_correct_outcome_points',
  'knockout_advancing_team_points',
  'knockout_decision_method_points',
  'round_of_16_team_points',
  'quarter_final_team_points',
  'semi_final_team_points',
  'finalist_points',
  'champion_points',
  'joker_multiplier',
  'group_stage_joker_cap',
  'knockout_joker_cap',
  'locked_at',
  'created_at',
  'updated_at',
])

export const PREDICTION_SET_COLUMNS = Object.freeze([
  'id',
  'tournament_id',
  'user_id',
  'contract_version',
  'scoring_ruleset_id',
  'revision',
  'submitted_at',
  'guest_imported_at',
  'last_save_source',
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
  'joker_applied',
  'created_at',
  'updated_at',
])

export const PREDICTION_GRACE_WINDOW_COLUMNS = Object.freeze([
  'id',
  'tournament_id',
  'user_id',
  'match_id',
  'granted_by_user_id',
  'granted_at',
  'expires_at',
  'reason',
  'revoked_at',
  'revoked_by_user_id',
  'revocation_reason',
  'created_at',
])

export const PREDICTION_WRITE_MODEL = Object.freeze({
  mode: 'atomic_bundle',
  directBrowserTableWrites: false,
  expectedRevisionRequired: true,
  databaseTimeAuthoritative: true,
  serverControlsOwnership: true,
  serverControlsTimestamps: true,
  validatesWholeBracketPath: true,
  validatesJokerCaps: true,
  validatesJokerMatchKickoff: true,
  validatesGraceScope: true,
  deletesOmittedDraftRowsBeforeLock: true,
  implementationMigration: '009',
  implemented: true,
  rpcName: 'save_my_prediction_bundle',
  guestImportImplemented: true,
})

export const PREDICTION_VISIBILITY_MODEL = Object.freeze({
  anonymousPredictionAccess: false,
  anonymousRulesetRead: true,
  ownerCanReadBeforeLock: true,
  otherAuthenticatedUsersCanReadBeforeLock: false,
  authenticatedUsersCanReadAfterLock: true,
  rawWritesGrantedToAuthenticated: false,
})

export const PREDICTION_COMPLETION_MODEL = Object.freeze({
  submitReviewModeAvailable: true,
  submitAffectsEligibility: false,
  submitCopiesPredictionRows: false,
  editReviewModeBeforeLock: true,
  savesAreDraftsUntilGlobalLock: true,
  completenessIsDerived: true,
  incompleteRowsMayRemainAtLock: true,
})

export const JOKER_DATABASE_MODEL = Object.freeze({
  enabled: true,
  storedOnMatchPrediction: true,
  capsStoredOnRuleset: true,
  multiplierStoredOnRuleset: true,
  unresolvedCapsStoredAsNull: true,
  movableOnlyBetweenUnstartedMatches: true,
  serverEnforcedByTrustedWrite: true,
})

export const GRACE_WINDOW_DATABASE_MODEL = Object.freeze({
  enabled: true,
  scope: 'user_and_match',
  adminGranted: true,
  targetMatchMustBeUnstarted: true,
  expiresAutomatically: true,
  revocable: true,
  audited: true,
})

export const GUEST_PREDICTION_MODEL = Object.freeze({
  coreArchitectureContext: true,
  serverStorage: false,
  scored: false,
  usesCanonicalResolver: true,
  importBeforeLockImplemented: true,
  explicitImportOnly: true,
  accountOverwriteAllowed: false,
})

export const DATABASE_SCORING_MODEL = Object.freeze({
  versionedRows: true,
  statusValues: Object.freeze(['provisional', 'locked', 'retired']),
  activeRulesetReferencedByTournament: true,
  predictionSetPinsRuleset: true,
  numericValuesStoredOnRulesetOnly: true,
  jokerValuesStoredOnRulesetOnly: true,
  lockedRulesetsImmutable: true,
  pointValuesCopiedIntoPredictionRows: false,
})

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isGoal(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

export function resolvePredictionDatabaseAccess({
  userId,
  ownerId,
  now = new Date(),
  scheduledLockAt = null,
  persistedLockedAt = null,
  matchKickoffAt = null,
  graceExpiresAt = null,
} = {}) {
  const authenticated = nonEmptyString(userId)
  const owner = authenticated && userId === ownerId
  const lock = resolvePredictionLock({ now, openingKickoffAt: scheduledLockAt, persistedLockedAt })
  const grace = owner && canUsePredictionGrace({ now, matchKickoffAt, graceExpiresAt })

  return Object.freeze({
    lockState: lock.state,
    canRead: owner || (authenticated && lock.canReveal),
    canMutatePredictionContent: owner && (lock.canEdit || grace),
    canMutateJoker: owner && canEditJoker({ now, matchKickoffAt }),
    graceActive: grace,
    revealToAuthenticated: authenticated && lock.canReveal,
    failClosed: lock.state === PREDICTION_LOCK_STATE.UNCONFIGURED,
  })
}

export function validatePredictionBundleShape(bundle) {
  const errors = []
  if (!bundle || typeof bundle !== 'object') return { valid: false, errors: ['bundle is required'] }
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
    if (prediction.joker_applied != null && typeof prediction.joker_applied !== 'boolean') {
      errors.push(`${prefix}.joker_applied must be a boolean`)
    }
  })

  return { valid: errors.length === 0, errors }
}

export function validatePredictionDatabaseContract() {
  const errors = []
  if (PREDICTION_DATABASE_SCOPE.activeMigrationCountAfterImplementation !== 5) errors.push('Migration 005 must leave five active migrations')
  if (PREDICTION_DATABASE_SCOPE.createsBrowserTableWrites) errors.push('Migration 005 must not enable direct browser table writes')
  if (PREDICTION_DATABASE_SCOPE.createsFinalSaveRpc) errors.push('Migration 005 must not create the final save RPC')
  if (PREDICTION_DATABASE_SCOPE.createsGuestServerStorage) errors.push('Migration 005 must not store guest predictions')
  if (ATOMIC_PREDICTION_SAVE_SCOPE.activeMigrationCountAfterImplementation !== 9) errors.push('Stage 6 must leave nine active migrations')
  if (!PREDICTION_WRITE_MODEL.implemented || PREDICTION_WRITE_MODEL.implementationMigration !== '009') errors.push('the trusted atomic save must be implemented by Migration 009')
  if (ATOMIC_PREDICTION_SAVE_SCOPE.directBrowserTableWrites) errors.push('Stage 6 must not enable direct browser table writes')
  if (PREDICTION_WRITE_MODEL.mode !== 'atomic_bundle') errors.push('prediction writes must use one atomic bundle')
  if (!PREDICTION_WRITE_MODEL.expectedRevisionRequired) errors.push('prediction writes must reject stale revisions')
  if (!PREDICTION_WRITE_MODEL.databaseTimeAuthoritative) errors.push('the database clock must be authoritative')
  if (!PREDICTION_WRITE_MODEL.validatesJokerCaps) errors.push('the server must validate joker caps')
  if (!PREDICTION_WRITE_MODEL.validatesJokerMatchKickoff) errors.push('the server must lock jokers at match kick-off')
  if (!DATABASE_SCORING_MODEL.lockedRulesetsImmutable) errors.push('locked scoring rulesets must be immutable')
  if (DATABASE_SCORING_MODEL.pointValuesCopiedIntoPredictionRows) errors.push('prediction rows must not copy scoring point values')
  if (PREDICTION_VISIBILITY_MODEL.otherAuthenticatedUsersCanReadBeforeLock) errors.push('other users must not see predictions before the global lock')
  if (!PREDICTION_VISIBILITY_MODEL.authenticatedUsersCanReadAfterLock) errors.push('authenticated users must be able to view predictions after the global lock')
  if (PREDICTION_COMPLETION_MODEL.submitAffectsEligibility) errors.push('submission must not affect eligibility')
  if (PREDICTION_COMPLETION_MODEL.submitCopiesPredictionRows) errors.push('submission must not copy prediction rows')
  if (!JOKER_DATABASE_MODEL.enabled) errors.push('jokers must be represented in the storage design')
  if (GRACE_WINDOW_DATABASE_MODEL.scope !== 'user_and_match') errors.push('grace windows must be scoped to one user and match')
  if (GUEST_PREDICTION_MODEL.serverStorage) errors.push('guest predictions must not use server storage')
  if (new Set(SCORING_RULE_CODES).size !== SCORING_RULE_CODES.length) errors.push('scoring rule codes must be unique')
  return { valid: errors.length === 0, errors }
}
