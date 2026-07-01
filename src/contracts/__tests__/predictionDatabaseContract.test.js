import { describe, expect, it } from 'vitest'
import {
  BRACKET_PREDICTION_COLUMNS,
  COMPETITION_SPLIT_SCOPE,
  DATABASE_SCORING_MODEL,
  GRACE_WINDOW_DATABASE_MODEL,
  GUEST_PREDICTION_MODEL,
  KO_PREDICTOR_MODEL,
  ORIGINAL_PREDICTOR_MODEL,
  PREDICTION_COMPETITION,
  PREDICTION_DATABASE_TABLES,
  PREDICTION_GRACE_WINDOW_COLUMNS,
  PREDICTION_ROW_KIND,
  PREDICTION_SET_COLUMNS,
  PREDICTION_VISIBILITY_MODEL,
  PREDICTION_WRITE_MODEL,
  SCORING_RULE_CODES,
  SCORING_RULESET_COLUMNS,
  resolvePredictionDatabaseAccess,
  validatePredictionBundleShape,
  validatePredictionDatabaseContract,
} from '../predictionDatabaseContract.js'

describe('Euro prediction competition split', () => {
  it('adds a separate competition namespace in Migration 010', () => {
    expect(COMPETITION_SPLIT_SCOPE.migrationNumber).toBe('010')
    expect(COMPETITION_SPLIT_SCOPE.activeMigrationCountAfterImplementation).toBe(10)
    expect(PREDICTION_SET_COLUMNS).toContain('competition_key')
    expect(PREDICTION_DATABASE_TABLES.BRACKET_PREDICTIONS).toBe('bracket_predictions')
  })

  it('keeps original group scores and bracket picks together but never KO scores', () => {
    expect(ORIGINAL_PREDICTOR_MODEL.groupScoreRows).toBe(36)
    expect(ORIGINAL_PREDICTOR_MODEL.bracketPickRows).toBe(15)
    expect(ORIGINAL_PREDICTOR_MODEL.bracketStoresScores).toBe(false)
    expect(ORIGINAL_PREDICTOR_MODEL.bracketStoresDecisionMethod).toBe(false)
    expect(ORIGINAL_PREDICTOR_MODEL.bracketStoresJokers).toBe(false)
  })

  it('stores original bracket progression in its own scoreless table', () => {
    expect(BRACKET_PREDICTION_COLUMNS).toContain('advancing_tournament_team_id')
    expect(BRACKET_PREDICTION_COLUMNS).not.toContain('home_score_90')
    expect(BRACKET_PREDICTION_COLUMNS).not.toContain('joker_applied')
  })

  it('defines KO Predictor as a separate 15-match competition', () => {
    expect(KO_PREDICTOR_MODEL.competitionKey).toBe(PREDICTION_COMPETITION.KO_PREDICTOR)
    expect(KO_PREDICTOR_MODEL.matchRows).toBe(15)
    expect(KO_PREDICTOR_MODEL.pointsSeparateFromOriginal).toBe(true)
    expect(KO_PREDICTOR_MODEL.leaderboardSeparateFromOriginal).toBe(true)
  })

  it('uses five group jokers, no bracket jokers and five KO Predictor jokers', () => {
    expect(ORIGINAL_PREDICTOR_MODEL.groupJokerCap).toBe(5)
    expect(ORIGINAL_PREDICTOR_MODEL.bracketJokerCap).toBe(0)
    expect(KO_PREDICTOR_MODEL.jokerCap).toBe(5)
  })

  it('keeps grace scoped to competition, user and match', () => {
    expect(PREDICTION_GRACE_WINDOW_COLUMNS).toContain('competition_key')
    expect(GRACE_WINDOW_DATABASE_MODEL.scope).toBe('competition_user_and_match')
    expect(GRACE_WINDOW_DATABASE_MODEL.crossesCompetitionBoundary).toBe(false)
  })

  it('keeps both save paths atomic and browser table writes blocked', () => {
    expect(PREDICTION_WRITE_MODEL.mode).toBe('separate_atomic_bundles')
    expect(PREDICTION_WRITE_MODEL.originalRpcName).toBe('save_my_prediction_bundle')
    expect(PREDICTION_WRITE_MODEL.koPredictorRpcName).toBe('save_my_ko_prediction_bundle')
    expect(PREDICTION_WRITE_MODEL.directBrowserTableWrites).toBe(false)
  })

  it('uses global original locks but per-match KO Predictor locks', () => {
    const original = resolvePredictionDatabaseAccess({
      competitionKey: PREDICTION_COMPETITION.ORIGINAL,
      userId: 'u1', ownerId: 'u1',
      now: '2028-06-10T12:00:00Z',
      scheduledLockAt: '2028-06-09T18:00:00Z',
      matchKickoffAt: '2028-06-20T18:00:00Z',
    })
    expect(original.canMutatePredictionContent).toBe(false)
    expect(original.canMutateJoker).toBe(true)

    const ko = resolvePredictionDatabaseAccess({
      competitionKey: PREDICTION_COMPETITION.KO_PREDICTOR,
      userId: 'u1', ownerId: 'u1',
      now: '2028-06-25T12:00:00Z',
      matchKickoffAt: '2028-06-25T18:00:00Z',
    })
    expect(ko.canMutatePredictionContent).toBe(true)
    expect(ko.revealToAuthenticated).toBe(false)
  })

  it('validates original group and bracket rows differently', () => {
    const result = validatePredictionBundleShape({
      tournament_id: 't1',
      expected_revision: 0,
      matches: [
        {
          prediction_kind: PREDICTION_ROW_KIND.GROUP_SCORE,
          match_id: 'm1',
          predicted_home_tournament_team_id: 'a',
          predicted_away_tournament_team_id: 'b',
          home_score_90: 1,
          away_score_90: 0,
          advancing_tournament_team_id: null,
          decision_method: null,
          joker_applied: true,
        },
        {
          prediction_kind: PREDICTION_ROW_KIND.BRACKET_PICK,
          match_id: 'm37',
          predicted_home_tournament_team_id: 'a',
          predicted_away_tournament_team_id: 'c',
          home_score_90: null,
          away_score_90: null,
          advancing_tournament_team_id: 'a',
          decision_method: null,
          joker_applied: false,
        },
      ],
    })
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('rejects scores and jokers on original bracket picks', () => {
    const result = validatePredictionBundleShape({
      tournament_id: 't1',
      expected_revision: 0,
      matches: [{
        prediction_kind: PREDICTION_ROW_KIND.BRACKET_PICK,
        match_id: 'm37',
        predicted_home_tournament_team_id: 'a',
        predicted_away_tournament_team_id: 'b',
        home_score_90: 1,
        away_score_90: 0,
        advancing_tournament_team_id: 'a',
        decision_method: null,
        joker_applied: true,
      }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('matches[0] bracket picks must not contain scores')
    expect(result.errors).toContain('matches[0] bracket picks must not contain a joker')
  })

  it('validates KO Predictor rows only in the KO competition', () => {
    const row = {
      prediction_kind: PREDICTION_ROW_KIND.KO_MATCH_SCORE,
      match_id: 'm37',
      predicted_home_tournament_team_id: 'a',
      predicted_away_tournament_team_id: 'b',
      home_score_90: 1,
      away_score_90: 1,
      advancing_tournament_team_id: 'a',
      decision_method: 'penalties',
      joker_applied: true,
    }
    expect(validatePredictionBundleShape({ tournament_id: 't1', expected_revision: 0, matches: [row] }, {
      competitionKey: PREDICTION_COMPETITION.KO_PREDICTOR,
    })).toEqual({ valid: true, errors: [] })
  })

  it('keeps scoring and visibility separation explicit', () => {
    expect(DATABASE_SCORING_MODEL.competitionTotalsMustRemainSeparate).toBe(true)
    expect(PREDICTION_VISIBILITY_MODEL.originalRevealedAfterGlobalLock).toBe(true)
    expect(PREDICTION_VISIBILITY_MODEL.koPredictorSharedReadDeferred).toBe(true)
    expect(SCORING_RULE_CODES).toHaveLength(12)
    expect(SCORING_RULESET_COLUMNS).toContain('knockout_joker_cap')
  })

  it('retains browser-only guest storage for the original predictor', () => {
    expect(GUEST_PREDICTION_MODEL.serverStorage).toBe(false)
    expect(GUEST_PREDICTION_MODEL.originalImportBeforeLock).toBe(true)
  })

  it('keeps the reconciled contract internally consistent', () => {
    expect(validatePredictionDatabaseContract()).toEqual({ valid: true, errors: [] })
  })
})
