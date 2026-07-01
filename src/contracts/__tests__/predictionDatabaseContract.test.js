import { describe, expect, it } from 'vitest'
import {
  DATABASE_SCORING_MODEL,
  GRACE_WINDOW_DATABASE_MODEL,
  GUEST_PREDICTION_MODEL,
  JOKER_DATABASE_MODEL,
  MATCH_PREDICTION_COLUMNS,
  PREDICTION_COMPLETION_MODEL,
  PREDICTION_DATABASE_SCOPE,
  PREDICTION_DATABASE_TABLES,
  PREDICTION_GRACE_WINDOW_COLUMNS,
  PREDICTION_SET_COLUMNS,
  PREDICTION_VISIBILITY_MODEL,
  PREDICTION_WRITE_MODEL,
  SCORING_RULE_CODES,
  SCORING_RULESET_COLUMNS,
  resolvePredictionDatabaseAccess,
  validatePredictionBundleShape,
  validatePredictionDatabaseContract,
} from '../predictionDatabaseContract.js'

describe('reconciled Euro prediction database design', () => {
  it('keeps Migration 005 storage-only with no direct browser writes', () => {
    expect(PREDICTION_DATABASE_SCOPE.migrationNumber).toBe('005')
    expect(PREDICTION_DATABASE_SCOPE.activeMigrationCountAfterImplementation).toBe(5)
    expect(PREDICTION_DATABASE_SCOPE.createsBrowserTableWrites).toBe(false)
    expect(PREDICTION_DATABASE_SCOPE.createsFinalSaveRpc).toBe(false)
    expect(PREDICTION_WRITE_MODEL.implementationMigration).toBe('006_or_later')
  })

  it('plans four focused tables including audited grace windows', () => {
    expect(PREDICTION_DATABASE_SCOPE.createdTables).toEqual([
      PREDICTION_DATABASE_TABLES.SCORING_RULESETS,
      PREDICTION_DATABASE_TABLES.PREDICTION_SETS,
      PREDICTION_DATABASE_TABLES.MATCH_PREDICTIONS,
      PREDICTION_DATABASE_TABLES.PREDICTION_GRACE_WINDOWS,
    ])
    expect(PREDICTION_GRACE_WINDOW_COLUMNS).toContain('expires_at')
    expect(PREDICTION_GRACE_WINDOW_COLUMNS).toContain('granted_by_user_id')
    expect(PREDICTION_GRACE_WINDOW_COLUMNS).toContain('revoked_at')
  })

  it('stores submission only as a reversible review state', () => {
    expect(PREDICTION_SET_COLUMNS).toContain('submitted_at')
    expect(PREDICTION_COMPLETION_MODEL.submitReviewModeAvailable).toBe(true)
    expect(PREDICTION_COMPLETION_MODEL.submitAffectsEligibility).toBe(false)
    expect(PREDICTION_COMPLETION_MODEL.submitCopiesPredictionRows).toBe(false)
  })

  it('stores projected participants, normal-time scores and joker allocation', () => {
    expect(MATCH_PREDICTION_COLUMNS).toContain('predicted_home_tournament_team_id')
    expect(MATCH_PREDICTION_COLUMNS).toContain('predicted_away_tournament_team_id')
    expect(MATCH_PREDICTION_COLUMNS).toContain('home_score_90')
    expect(MATCH_PREDICTION_COLUMNS).toContain('away_score_90')
    expect(MATCH_PREDICTION_COLUMNS).toContain('joker_applied')
  })

  it('uses one atomic bundle and server-side joker validation', () => {
    expect(PREDICTION_WRITE_MODEL.mode).toBe('atomic_bundle')
    expect(PREDICTION_WRITE_MODEL.expectedRevisionRequired).toBe(true)
    expect(PREDICTION_WRITE_MODEL.validatesWholeBracketPath).toBe(true)
    expect(PREDICTION_WRITE_MODEL.validatesJokerCaps).toBe(true)
    expect(PREDICTION_WRITE_MODEL.validatesJokerMatchKickoff).toBe(true)
  })

  it('keeps ownership, timestamps and timing server-controlled', () => {
    expect(PREDICTION_WRITE_MODEL.serverControlsOwnership).toBe(true)
    expect(PREDICTION_WRITE_MODEL.serverControlsTimestamps).toBe(true)
    expect(PREDICTION_WRITE_MODEL.databaseTimeAuthoritative).toBe(true)
  })

  it('allows only the owner to read and edit content before lock', () => {
    const input = { now: '2028-06-09T10:00:00Z', scheduledLockAt: '2028-06-09T18:00:00Z' }
    expect(resolvePredictionDatabaseAccess({ ...input, userId: 'u1', ownerId: 'u1' })).toMatchObject({
      canRead: true,
      canMutatePredictionContent: true,
      revealToAuthenticated: false,
    })
    expect(resolvePredictionDatabaseAccess({ ...input, userId: 'u2', ownerId: 'u1' })).toMatchObject({
      canRead: false,
      canMutatePredictionContent: false,
    })
  })

  it('locks content globally but still permits joker movement on a future match', () => {
    const access = resolvePredictionDatabaseAccess({
      userId: 'u1', ownerId: 'u1',
      now: '2028-06-10T12:00:00Z',
      scheduledLockAt: '2028-06-09T18:00:00Z',
      matchKickoffAt: '2028-06-20T18:00:00Z',
    })
    expect(access.canMutatePredictionContent).toBe(false)
    expect(access.canMutateJoker).toBe(true)
  })

  it('allows a scoped grace edit only for an active unstarted match', () => {
    const access = resolvePredictionDatabaseAccess({
      userId: 'u1', ownerId: 'u1',
      now: '2028-07-04T12:00:00Z',
      scheduledLockAt: '2028-06-09T18:00:00Z',
      matchKickoffAt: '2028-07-04T19:00:00Z',
      graceExpiresAt: '2028-07-04T12:30:00Z',
    })
    expect(access.graceActive).toBe(true)
    expect(access.canMutatePredictionContent).toBe(true)
  })

  it('reveals but does not ordinarily edit after the global lock', () => {
    const access = resolvePredictionDatabaseAccess({
      userId: 'u2', ownerId: 'u1',
      now: '2028-06-09T18:00:01Z',
      scheduledLockAt: '2028-06-09T18:00:00Z',
    })
    expect(access.canRead).toBe(true)
    expect(access.canMutatePredictionContent).toBe(false)
    expect(access.revealToAuthenticated).toBe(true)
  })

  it('keeps values only on versioned scoring rulesets', () => {
    expect(DATABASE_SCORING_MODEL.versionedRows).toBe(true)
    expect(DATABASE_SCORING_MODEL.predictionSetPinsRuleset).toBe(true)
    expect(DATABASE_SCORING_MODEL.pointValuesCopiedIntoPredictionRows).toBe(false)
    expect(DATABASE_SCORING_MODEL.jokerValuesStoredOnRulesetOnly).toBe(true)
    expect(SCORING_RULE_CODES).toHaveLength(12)
    expect(SCORING_RULESET_COLUMNS).toContain('joker_multiplier')
    expect(SCORING_RULESET_COLUMNS).toContain('group_stage_joker_cap')
    expect(SCORING_RULESET_COLUMNS).toContain('knockout_joker_cap')
  })

  it('makes guest mode architectural but never server-persisted', () => {
    expect(GUEST_PREDICTION_MODEL.coreArchitectureContext).toBe(true)
    expect(GUEST_PREDICTION_MODEL.serverStorage).toBe(false)
    expect(GUEST_PREDICTION_MODEL.usesCanonicalResolver).toBe(true)
  })

  it('defines server-enforced joker and audited grace models', () => {
    expect(JOKER_DATABASE_MODEL.enabled).toBe(true)
    expect(JOKER_DATABASE_MODEL.movableOnlyBetweenUnstartedMatches).toBe(true)
    expect(GRACE_WINDOW_DATABASE_MODEL.scope).toBe('user_and_match')
    expect(GRACE_WINDOW_DATABASE_MODEL.targetMatchMustBeUnstarted).toBe(true)
  })

  it('rejects duplicate matches, malformed scores and invalid joker values', () => {
    const result = validatePredictionBundleShape({
      tournament_id: 't1', expected_revision: 0,
      matches: [
        { match_id: 'm1', predicted_home_tournament_team_id: 'a', predicted_away_tournament_team_id: 'b', home_score_90: 1, away_score_90: 0, joker_applied: true },
        { match_id: 'm1', predicted_home_tournament_team_id: 'a', predicted_away_tournament_team_id: 'a', home_score_90: -1, away_score_90: 0, joker_applied: 'yes' },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('matches[1].match_id is duplicated')
    expect(result.errors).toContain('matches[1] must contain two different predicted participants')
    expect(result.errors).toContain('matches[1].home_score_90 must be an integer from 0 to 99')
    expect(result.errors).toContain('matches[1].joker_applied must be a boolean')
  })

  it('keeps the reconciled design internally consistent', () => {
    expect(validatePredictionDatabaseContract()).toEqual({ valid: true, errors: [] })
    expect(PREDICTION_VISIBILITY_MODEL.rawWritesGrantedToAuthenticated).toBe(false)
    expect(PREDICTION_DATABASE_SCOPE.createsGuestServerStorage).toBe(false)
  })
})
