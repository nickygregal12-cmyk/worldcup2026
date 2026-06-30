import { describe, expect, it } from 'vitest'
import {
  DATABASE_SCORING_MODEL,
  MATCH_PREDICTION_COLUMNS,
  PREDICTION_COMPLETION_MODEL,
  PREDICTION_DATABASE_SCOPE,
  PREDICTION_DATABASE_TABLES,
  PREDICTION_SET_COLUMNS,
  PREDICTION_VISIBILITY_MODEL,
  PREDICTION_WRITE_MODEL,
  SCORING_RULE_CODES,
  resolvePredictionDatabaseAccess,
  validatePredictionBundleShape,
  validatePredictionDatabaseContract,
} from '../predictionDatabaseContract.js'

describe('Euro prediction database design', () => {
  it('keeps Migration 005 schema-only with no direct browser writes', () => {
    expect(PREDICTION_DATABASE_SCOPE.plannedMigrationNumber).toBe('005')
    expect(PREDICTION_DATABASE_SCOPE.createsBrowserTableWrites).toBe(false)
    expect(PREDICTION_WRITE_MODEL.implementationMigration).toBe('006_or_later')
  })

  it('uses three focused tables', () => {
    expect(PREDICTION_DATABASE_SCOPE.plannedTables).toEqual([
      PREDICTION_DATABASE_TABLES.SCORING_RULESETS,
      PREDICTION_DATABASE_TABLES.PREDICTION_SETS,
      PREDICTION_DATABASE_TABLES.MATCH_PREDICTIONS,
    ])
  })

  it('pins each prediction set to a ruleset and revision', () => {
    expect(PREDICTION_SET_COLUMNS).toContain('scoring_ruleset_id')
    expect(PREDICTION_SET_COLUMNS).toContain('contract_version')
    expect(PREDICTION_SET_COLUMNS).toContain('revision')
  })

  it('stores projected participants and normal-time scores', () => {
    expect(MATCH_PREDICTION_COLUMNS).toContain('predicted_home_tournament_team_id')
    expect(MATCH_PREDICTION_COLUMNS).toContain('predicted_away_tournament_team_id')
    expect(MATCH_PREDICTION_COLUMNS).toContain('home_score_90')
    expect(MATCH_PREDICTION_COLUMNS).toContain('away_score_90')
  })

  it('keeps knockout advancement and method separate', () => {
    expect(MATCH_PREDICTION_COLUMNS).toContain('advancing_tournament_team_id')
    expect(MATCH_PREDICTION_COLUMNS).toContain('decision_method')
  })

  it('uses one atomic bundle and optimistic revision', () => {
    expect(PREDICTION_WRITE_MODEL.mode).toBe('atomic_bundle')
    expect(PREDICTION_WRITE_MODEL.expectedRevisionRequired).toBe(true)
    expect(PREDICTION_WRITE_MODEL.validatesWholeBracketPath).toBe(true)
  })

  it('keeps ownership and timestamps server-controlled', () => {
    expect(PREDICTION_WRITE_MODEL.serverControlsOwnership).toBe(true)
    expect(PREDICTION_WRITE_MODEL.serverControlsTimestamps).toBe(true)
    expect(PREDICTION_WRITE_MODEL.databaseTimeAuthoritative).toBe(true)
  })

  it('fails closed when the scheduled lock is missing', () => {
    const access = resolvePredictionDatabaseAccess({ userId: 'u1', ownerId: 'u1' })
    expect(access.failClosed).toBe(true)
    expect(access.canMutate).toBe(false)
    expect(access.canRead).toBe(true)
  })

  it('allows only the owner to read and edit before lock', () => {
    const input = {
      now: '2028-06-09T10:00:00Z',
      scheduledLockAt: '2028-06-09T18:00:00Z',
    }
    expect(resolvePredictionDatabaseAccess({ ...input, userId: 'u1', ownerId: 'u1' })).toMatchObject({
      canRead: true,
      canMutate: true,
      revealToAuthenticated: false,
    })
    expect(resolvePredictionDatabaseAccess({ ...input, userId: 'u2', ownerId: 'u1' })).toMatchObject({
      canRead: false,
      canMutate: false,
      revealToAuthenticated: false,
    })
  })

  it('reveals but does not edit after the global lock', () => {
    const access = resolvePredictionDatabaseAccess({
      userId: 'u2',
      ownerId: 'u1',
      now: '2028-06-09T18:00:01Z',
      scheduledLockAt: '2028-06-09T18:00:00Z',
    })
    expect(access.canRead).toBe(true)
    expect(access.canMutate).toBe(false)
    expect(access.revealToAuthenticated).toBe(true)
  })

  it('keeps a persisted lock monotonic even if the schedule changes', () => {
    const access = resolvePredictionDatabaseAccess({
      userId: 'u1',
      ownerId: 'u1',
      now: '2028-06-09T12:00:00Z',
      scheduledLockAt: '2028-06-10T18:00:00Z',
      persistedLockedAt: '2028-06-09T11:00:00Z',
    })
    expect(access.canMutate).toBe(false)
    expect(access.revealToAuthenticated).toBe(true)
  })

  it('keeps point values only on versioned scoring rulesets', () => {
    expect(DATABASE_SCORING_MODEL.versionedRows).toBe(true)
    expect(DATABASE_SCORING_MODEL.predictionSetPinsRuleset).toBe(true)
    expect(DATABASE_SCORING_MODEL.pointValuesCopiedIntoPredictionRows).toBe(false)
    expect(SCORING_RULE_CODES).toHaveLength(9)
  })

  it('does not introduce a separate submit button contract', () => {
    expect(PREDICTION_COMPLETION_MODEL.explicitSubmitRequired).toBe(false)
    expect(PREDICTION_COMPLETION_MODEL.completenessIsDerived).toBe(true)
  })

  it('rejects duplicate matches and malformed score rows', () => {
    const result = validatePredictionBundleShape({
      tournament_id: 't1',
      expected_revision: 0,
      matches: [
        {
          match_id: 'm1',
          predicted_home_tournament_team_id: 'a',
          predicted_away_tournament_team_id: 'b',
          home_score_90: 1,
          away_score_90: 0,
        },
        {
          match_id: 'm1',
          predicted_home_tournament_team_id: 'a',
          predicted_away_tournament_team_id: 'a',
          home_score_90: -1,
          away_score_90: 0,
        },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('matches[1].match_id is duplicated')
    expect(result.errors).toContain('matches[1] must contain two different predicted participants')
    expect(result.errors).toContain('matches[1].home_score_90 must be an integer from 0 to 99')
  })

  it('keeps the design internally consistent', () => {
    expect(validatePredictionDatabaseContract()).toEqual({ valid: true, errors: [] })
    expect(PREDICTION_VISIBILITY_MODEL.rawWritesGrantedToAuthenticated).toBe(false)
  })
})
