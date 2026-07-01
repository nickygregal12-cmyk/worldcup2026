import {
  PREDICTION_LOCK_STATE,
  canEditJoker,
  canUsePredictionGrace,
  resolvePredictionLock,
} from './lockContract.js'

export const EURO_PREDICTION_DATABASE_CONTRACT_VERSION = 'euro28-prediction-db-v3'

export const PREDICTION_COMPETITION = Object.freeze({
  ORIGINAL: 'original',
  KO_PREDICTOR: 'ko_predictor',
})

export const PREDICTION_ROW_KIND = Object.freeze({
  GROUP_SCORE: 'group_score',
  BRACKET_PICK: 'bracket_pick',
  KO_MATCH_SCORE: 'ko_match_score',
})

export const PREDICTION_DATABASE_TABLES = Object.freeze({
  SCORING_RULESETS: 'scoring_rulesets',
  PREDICTION_SETS: 'prediction_sets',
  MATCH_PREDICTIONS: 'match_predictions',
  BRACKET_PREDICTIONS: 'bracket_predictions',
  PREDICTION_GRACE_WINDOWS: 'prediction_grace_windows',
})

export const COMPETITION_SPLIT_SCOPE = Object.freeze({
  activeMigrationCountAfterImplementation: 10,
  migrationNumber: '010',
  migrationFilename: '202607010010_euro28_competition_split_and_jokers.sql',
  originalRpc: 'save_my_prediction_bundle',
  koPredictorRpc: 'save_my_ko_prediction_bundle',
  originalSetContainsGroupScores: true,
  originalSetContainsBracketPicks: true,
  originalSetContainsKoScores: false,
  koPredictorPointsSeparate: true,
  koPredictorLeaderboardSeparate: true,
})

export const PREDICTION_SET_COLUMNS = Object.freeze([
  'id',
  'tournament_id',
  'user_id',
  'competition_key',
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

export const BRACKET_PREDICTION_COLUMNS = Object.freeze([
  'id',
  'prediction_set_id',
  'tournament_id',
  'match_id',
  'predicted_home_tournament_team_id',
  'predicted_away_tournament_team_id',
  'advancing_tournament_team_id',
  'created_at',
  'updated_at',
])

export const PREDICTION_GRACE_WINDOW_COLUMNS = Object.freeze([
  'id',
  'tournament_id',
  'competition_key',
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

export const SCORING_RULE_CODES = Object.freeze([
  'match_exact_score',
  'match_correct_outcome',
  'ko_predictor_correct_advancing_team',
  'ko_predictor_correct_decision_method',
  'bracket_round_of_16',
  'bracket_quarter_final',
  'bracket_semi_final',
  'bracket_final',
  'bracket_champion',
  'joker_multiplier',
  'joker_group_stage_cap',
  'joker_ko_predictor_cap',
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

export const ORIGINAL_PREDICTOR_MODEL = Object.freeze({
  competitionKey: PREDICTION_COMPETITION.ORIGINAL,
  groupScoreRows: 36,
  bracketPickRows: 15,
  groupJokerCap: 5,
  bracketJokerCap: 0,
  bracketStoresScores: false,
  bracketStoresDecisionMethod: false,
  bracketStoresJokers: false,
  globalContentLock: true,
})

export const KO_PREDICTOR_MODEL = Object.freeze({
  competitionKey: PREDICTION_COMPETITION.KO_PREDICTOR,
  matchRows: 15,
  jokerCap: 5,
  usesResolvedRealFixtures: true,
  storesScore90: true,
  storesAdvancingTeam: true,
  storesDecisionMethod: true,
  perMatchLock: true,
  pointsSeparateFromOriginal: true,
  leaderboardSeparateFromOriginal: true,
})

export const PREDICTION_WRITE_MODEL = Object.freeze({
  mode: 'separate_atomic_bundles',
  directBrowserTableWrites: false,
  expectedRevisionRequired: true,
  databaseTimeAuthoritative: true,
  serverControlsOwnership: true,
  serverControlsTimestamps: true,
  validatesWholeBracketPath: true,
  validatesJokerCaps: true,
  validatesJokerMatchKickoff: true,
  validatesGraceScope: true,
  implementationMigration: '010',
  originalRpcName: 'save_my_prediction_bundle',
  koPredictorRpcName: 'save_my_ko_prediction_bundle',
  guestImportImplemented: true,
})

export const PREDICTION_VISIBILITY_MODEL = Object.freeze({
  anonymousPredictionAccess: false,
  ownerCanReadBeforeLock: true,
  originalRevealedAfterGlobalLock: true,
  koPredictorSharedReadDeferred: true,
  rawWritesGrantedToAuthenticated: false,
})

export const GRACE_WINDOW_DATABASE_MODEL = Object.freeze({
  enabled: true,
  scope: 'competition_user_and_match',
  serviceRoleManaged: true,
  targetMatchMustBeUnstarted: true,
  expiresAutomatically: true,
  revocable: true,
  audited: true,
  crossesCompetitionBoundary: false,
})

export const GUEST_PREDICTION_MODEL = Object.freeze({
  serverStorage: false,
  usesCanonicalResolver: true,
  originalImportBeforeLock: true,
  explicitImportOnly: true,
  accountOverwriteAllowed: false,
  koPredictorGuestStorageDeferred: true,
})

export const DATABASE_SCORING_MODEL = Object.freeze({
  versionedRows: true,
  predictionSetPinsRuleset: true,
  jokerValuesStoredOnRulesetOnly: true,
  lockedRulesetsImmutable: true,
  pointValuesCopiedIntoPredictionRows: false,
  competitionTotalsMustRemainSeparate: true,
})

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isGoal(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

export function resolvePredictionDatabaseAccess({
  competitionKey = PREDICTION_COMPETITION.ORIGINAL,
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
  const grace = owner && canUsePredictionGrace({ now, matchKickoffAt, graceExpiresAt })

  if (competitionKey === PREDICTION_COMPETITION.KO_PREDICTOR) {
    const canEdit = owner && canEditJoker({ now, matchKickoffAt })
    return Object.freeze({
      competitionKey,
      lockState: canEdit ? PREDICTION_LOCK_STATE.OPEN : PREDICTION_LOCK_STATE.LOCKED,
      canRead: owner,
      canMutatePredictionContent: canEdit || grace,
      canMutateJoker: canEdit,
      graceActive: grace,
      revealToAuthenticated: false,
      failClosed: !matchKickoffAt,
    })
  }

  const lock = resolvePredictionLock({ now, openingKickoffAt: scheduledLockAt, persistedLockedAt })
  return Object.freeze({
    competitionKey,
    lockState: lock.state,
    canRead: owner || (authenticated && lock.canReveal),
    canMutatePredictionContent: owner && (lock.canEdit || grace),
    canMutateJoker: owner && canEditJoker({ now, matchKickoffAt }),
    graceActive: grace,
    revealToAuthenticated: authenticated && lock.canReveal,
    failClosed: lock.state === PREDICTION_LOCK_STATE.UNCONFIGURED,
  })
}

export function validatePredictionBundleShape(bundle, {
  competitionKey = PREDICTION_COMPETITION.ORIGINAL,
} = {}) {
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

    const kind = prediction.prediction_kind
    if (!Object.values(PREDICTION_ROW_KIND).includes(kind)) {
      errors.push(`${prefix}.prediction_kind is unsupported`)
      return
    }

    if (competitionKey === PREDICTION_COMPETITION.ORIGINAL && kind === PREDICTION_ROW_KIND.GROUP_SCORE) {
      if (!isGoal(prediction.home_score_90)) errors.push(`${prefix}.home_score_90 must be an integer from 0 to 99`)
      if (!isGoal(prediction.away_score_90)) errors.push(`${prefix}.away_score_90 must be an integer from 0 to 99`)
      if (prediction.advancing_tournament_team_id != null) errors.push(`${prefix} group rows must not contain an advancing team`)
    } else if (competitionKey === PREDICTION_COMPETITION.ORIGINAL && kind === PREDICTION_ROW_KIND.BRACKET_PICK) {
      if (prediction.home_score_90 != null || prediction.away_score_90 != null) errors.push(`${prefix} bracket picks must not contain scores`)
      if (!nonEmptyString(prediction.advancing_tournament_team_id)) errors.push(`${prefix}.advancing_tournament_team_id is required`)
      if (prediction.decision_method != null) errors.push(`${prefix} bracket picks must not contain a decision method`)
      if (prediction.joker_applied) errors.push(`${prefix} bracket picks must not contain a joker`)
    } else if (competitionKey === PREDICTION_COMPETITION.KO_PREDICTOR && kind === PREDICTION_ROW_KIND.KO_MATCH_SCORE) {
      if (!isGoal(prediction.home_score_90)) errors.push(`${prefix}.home_score_90 must be an integer from 0 to 99`)
      if (!isGoal(prediction.away_score_90)) errors.push(`${prefix}.away_score_90 must be an integer from 0 to 99`)
      if (!nonEmptyString(prediction.advancing_tournament_team_id)) errors.push(`${prefix}.advancing_tournament_team_id is required`)
      if (!['normal_time', 'extra_time', 'penalties'].includes(prediction.decision_method)) {
        errors.push(`${prefix}.decision_method is required`)
      }
    } else {
      errors.push(`${prefix}.prediction_kind does not belong to ${competitionKey}`)
    }

    if (prediction.joker_applied != null && typeof prediction.joker_applied !== 'boolean') {
      errors.push(`${prefix}.joker_applied must be a boolean`)
    }
  })

  return { valid: errors.length === 0, errors }
}

export function validatePredictionDatabaseContract() {
  const errors = []
  if (COMPETITION_SPLIT_SCOPE.activeMigrationCountAfterImplementation !== 10) errors.push('Stage 8 must leave ten active migrations')
  if (!COMPETITION_SPLIT_SCOPE.koPredictorPointsSeparate) errors.push('KO Predictor points must remain separate')
  if (ORIGINAL_PREDICTOR_MODEL.bracketJokerCap !== 0) errors.push('the original bracket must not allow jokers')
  if (KO_PREDICTOR_MODEL.jokerCap !== 5) errors.push('the KO Predictor joker cap must be five')
  if (PREDICTION_WRITE_MODEL.directBrowserTableWrites) errors.push('direct browser writes are forbidden')
  if (!DATABASE_SCORING_MODEL.competitionTotalsMustRemainSeparate) errors.push('competition totals must remain separate')
  if (GRACE_WINDOW_DATABASE_MODEL.crossesCompetitionBoundary) errors.push('grace must not cross competition boundaries')
  if (GUEST_PREDICTION_MODEL.serverStorage) errors.push('guest predictions must remain browser-only')
  if (new Set(SCORING_RULE_CODES).size !== SCORING_RULE_CODES.length) errors.push('scoring rule codes must be unique')
  return { valid: errors.length === 0, errors }
}
