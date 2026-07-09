// CONTRACT RECORD — no runtime consumers, deliberately kept.
// This module freezes the agreed Original/KO point structure as executable
// record. It is enforced by scripts/check-prediction-contracts.mjs (content
// assertions), exercised by its tests, and reachable only from the quarantined
// legacy layer at runtime. Displayed values come from the database ruleset via
// resolveActiveScoring; do NOT wire this module into live surfaces.
import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'
import { DECISION_METHOD } from './resultContract.js'

export const EURO_PREDICTION_CONTRACT_VERSION = 'euro28-v2'

export const MATCH_SCORE_POINTS = EURO_SCORING_CONFIG.match

export const KNOCKOUT_MATCH_POINTS = EURO_SCORING_CONFIG.koPredictor

export const BRACKET_REACH_POINTS = EURO_SCORING_CONFIG.bracket

export const JOKER_RULES = EURO_SCORING_CONFIG.joker

export const BRACKET_MILESTONES = Object.freeze(Object.keys(BRACKET_REACH_POINTS))

function isGoal(value) {
  return Number.isInteger(value) && value >= 0 && value <= 99
}

export function getScoreOutcome(homeScore, awayScore) {
  if (!isGoal(homeScore) || !isGoal(awayScore)) return null
  if (homeScore > awayScore) return 'home'
  if (awayScore > homeScore) return 'away'
  return 'draw'
}

function scoreErrors(prediction) {
  const errors = []
  if (!prediction || typeof prediction !== 'object') return ['prediction is required']
  if (!isGoal(prediction.home_score)) errors.push('home_score must be an integer from 0 to 99')
  if (!isGoal(prediction.away_score)) errors.push('away_score must be an integer from 0 to 99')
  return errors
}

export function validateGroupPrediction(prediction, { participantsResolved = true } = {}) {
  const errors = scoreErrors(prediction)
  if (!participantsResolved) errors.push('both match participants must be resolved before predictions open')
  return { valid: errors.length === 0, errors }
}

export function validateKnockoutPrediction(prediction, { homeTeamId, awayTeamId } = {}) {
  const errors = scoreErrors(prediction)
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    errors.push('two different resolved participants are required')
  }
  if (!prediction || typeof prediction !== 'object') return { valid: false, errors }

  const participantIds = new Set([homeTeamId, awayTeamId].filter(Boolean))
  if (!participantIds.has(prediction.advancing_team_id)) {
    errors.push('advancing_team_id must be one of the two participants')
  }

  const outcome = getScoreOutcome(prediction.home_score, prediction.away_score)
  const method = prediction.decision_method
  if (![DECISION_METHOD.NORMAL_TIME, DECISION_METHOD.EXTRA_TIME, DECISION_METHOD.PENALTIES].includes(method)) {
    errors.push('decision_method must be normal_time, extra_time or penalties')
  } else if (method === DECISION_METHOD.NORMAL_TIME) {
    if (outcome === 'draw') errors.push('normal_time requires a non-draw score')
    const scoreWinner = outcome === 'home' ? homeTeamId : outcome === 'away' ? awayTeamId : null
    if (scoreWinner && prediction.advancing_team_id !== scoreWinner) {
      errors.push('the selected advancing team must match the normal-time score winner')
    }
  } else if (outcome && outcome !== 'draw') {
    errors.push('extra_time or penalties requires a draw at the end of normal time')
  }

  return { valid: errors.length === 0, errors }
}

function calculateBaseScorePoints(prediction, result) {
  const predictedOutcome = getScoreOutcome(prediction.home_score, prediction.away_score)
  const actualOutcome = getScoreOutcome(result.normalTimeHomeGoals, result.normalTimeAwayGoals)
  if (!predictedOutcome || !actualOutcome || predictedOutcome !== actualOutcome) {
    return { exactScore: 0, correctOutcome: 0, total: 0 }
  }

  const exact = prediction.home_score === result.normalTimeHomeGoals &&
    prediction.away_score === result.normalTimeAwayGoals

  return exact
    ? { exactScore: MATCH_SCORE_POINTS.EXACT_SCORE, correctOutcome: 0, total: MATCH_SCORE_POINTS.EXACT_SCORE }
    : { exactScore: 0, correctOutcome: MATCH_SCORE_POINTS.CORRECT_OUTCOME, total: MATCH_SCORE_POINTS.CORRECT_OUTCOME }
}

/**
 * Score a prediction against the canonical normal-time result. Knockout
 * advancement and method are separate, transparent additions. A method bonus
 * is available only when the advancing team is also correct.
 */
export function calculateMatchPredictionPoints(prediction, canonicalResult, { isKnockout = false, jokerApplied = false } = {}) {
  if (!prediction || !canonicalResult) {
    return Object.freeze({
      exactScore: 0,
      correctOutcome: 0,
      correctAdvancingTeam: 0,
      correctDecisionMethod: 0,
      jokerApplied: false,
      jokerMultiplier: 1,
      totalBeforeJoker: 0,
      total: 0,
    })
  }

  const base = calculateBaseScorePoints(prediction, canonicalResult)
  let advancing = 0
  let method = 0

  if (isKnockout && prediction.advancing_team_id === canonicalResult.advancingTeamId) {
    advancing = KNOCKOUT_MATCH_POINTS.CORRECT_ADVANCING_TEAM
    if (prediction.decision_method === canonicalResult.decisionMethod) {
      method = KNOCKOUT_MATCH_POINTS.CORRECT_DECISION_METHOD
    }
  }

  const totalBeforeJoker = base.total + advancing + method
  const jokerMultiplier = jokerApplied && JOKER_RULES.ENABLED ? JOKER_RULES.MULTIPLIER : 1

  return Object.freeze({
    exactScore: base.exactScore,
    correctOutcome: base.correctOutcome,
    correctAdvancingTeam: advancing,
    correctDecisionMethod: method,
    jokerApplied: jokerApplied && JOKER_RULES.ENABLED,
    jokerMultiplier,
    totalBeforeJoker,
    total: totalBeforeJoker * jokerMultiplier,
  })
}

function uniqueTeamIds(value) {
  if (!Array.isArray(value)) return new Set()
  return new Set(value.filter(teamId => typeof teamId === 'string' && teamId.trim() !== ''))
}

/**
 * Bracket points are awarded by team reaching a milestone, not by the exact
 * match number or path used in the user's bracket. This prevents a correct
 * team from losing its round-reach value solely because another prediction
 * changed the projected path.
 */
export function calculateBracketReachPoints(predictedByMilestone = {}, actualByMilestone = {}) {
  const byMilestone = {}
  let total = 0

  for (const milestone of BRACKET_MILESTONES) {
    const predicted = uniqueTeamIds(predictedByMilestone[milestone])
    const actual = uniqueTeamIds(actualByMilestone[milestone])
    const correctTeamIds = [...predicted].filter(teamId => actual.has(teamId)).sort()
    const points = correctTeamIds.length * BRACKET_REACH_POINTS[milestone]
    byMilestone[milestone] = Object.freeze({
      correctTeamIds: Object.freeze(correctTeamIds),
      pointsPerTeam: BRACKET_REACH_POINTS[milestone],
      points,
    })
    total += points
  }

  return Object.freeze({ byMilestone: Object.freeze(byMilestone), total })
}
