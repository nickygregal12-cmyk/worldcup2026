/**
 * Single source of truth for Euro 2028 scoring values and joker limits.
 *
 * The original predictor and KO Predictor are separate competitions:
 * - original: group scores plus pre-tournament bracket progression;
 * - KO Predictor: real knockout-match scores, advancing team and method.
 *
 * KO Predictor points and jokers never contribute to the original predictor.
 */
export const SCORING_CONFIG_STATUS = Object.freeze({
  PROVISIONAL: 'provisional',
  LOCKED: 'locked',
})

export const EURO_SCORING_CONFIG = Object.freeze({
  // Values are the locked scoring contract (CLAUDE.md §4, owner ruling 2026-07-10).
  // Status stays provisional and the ruleset_key is unchanged so the DB
  // scoring_rulesets row remains mutable for the matching value update (see the
  // Stage DP-SCORING migration and the idempotent staging SQL).
  version: 'euro28-scoring-provisional-v2',
  status: SCORING_CONFIG_STATUS.PROVISIONAL,
  match: Object.freeze({
    EXACT_SCORE: 5, // exact group score (total, not cumulative)
    CORRECT_OUTCOME: 3, // correct group result
  }),
  groupPositions: Object.freeze({
    PER_CORRECT_POSITION: 2, // 2 per correct final group position (auto-derived from the 36 group scores)
    PERFECT_GROUP_BONUS: 5, // +5 when all four positions in a group are correct
  }),
  koPredictor: Object.freeze({
    // KO Predictor match: three additive components; regulation max 10, ET max 15.
    CORRECT_ADVANCER: 5, // your picked team advanced (any method)
    CORRECT_DRAW_CALL: 5, // you predicted a level 90-min score and it was level
    EXACT_90_SCORE: 5, // exact 90-minute scoreline
  }),
  bracket: Object.freeze({
    // Original Bracket cumulative team-progression totals (Champion = Final + 25).
    round_of_16: 8,
    quarter_final: 12,
    semi_final: 15,
    final: 20,
    champion: 45,
  }),
  joker: Object.freeze({
    ENABLED: true,
    MULTIPLIER: 2,
    GROUP_STAGE_CAP: 5,
    ORIGINAL_BRACKET_CAP: 0,
    KO_PREDICTOR_CAP: 5,
  }),
})

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function validateScoringConfig(config = EURO_SCORING_CONFIG) {
  const errors = []

  if (!config || typeof config !== 'object') return { valid: false, errors: ['scoring config is required'] }
  if (typeof config.version !== 'string' || config.version.trim() === '') errors.push('version is required')
  if (!Object.values(SCORING_CONFIG_STATUS).includes(config.status)) errors.push('status must be provisional or locked')

  const values = [
    ['match.EXACT_SCORE', config.match?.EXACT_SCORE],
    ['match.CORRECT_OUTCOME', config.match?.CORRECT_OUTCOME],
    ['groupPositions.PER_CORRECT_POSITION', config.groupPositions?.PER_CORRECT_POSITION],
    ['groupPositions.PERFECT_GROUP_BONUS', config.groupPositions?.PERFECT_GROUP_BONUS],
    ['koPredictor.CORRECT_ADVANCER', config.koPredictor?.CORRECT_ADVANCER],
    ['koPredictor.CORRECT_DRAW_CALL', config.koPredictor?.CORRECT_DRAW_CALL],
    ['koPredictor.EXACT_90_SCORE', config.koPredictor?.EXACT_90_SCORE],
    ['bracket.round_of_16', config.bracket?.round_of_16],
    ['bracket.quarter_final', config.bracket?.quarter_final],
    ['bracket.semi_final', config.bracket?.semi_final],
    ['bracket.final', config.bracket?.final],
    ['bracket.champion', config.bracket?.champion],
    ['joker.GROUP_STAGE_CAP', config.joker?.GROUP_STAGE_CAP],
    ['joker.ORIGINAL_BRACKET_CAP', config.joker?.ORIGINAL_BRACKET_CAP],
    ['joker.KO_PREDICTOR_CAP', config.joker?.KO_PREDICTOR_CAP],
  ]

  for (const [label, value] of values) {
    if (!isNonNegativeInteger(value)) errors.push(`${label} must be a non-negative integer`)
  }

  if (isNonNegativeInteger(config.match?.EXACT_SCORE) &&
      isNonNegativeInteger(config.match?.CORRECT_OUTCOME) &&
      config.match.EXACT_SCORE < config.match.CORRECT_OUTCOME) {
    errors.push('exact-score points must not be lower than correct-outcome points')
  }

  if (config.joker?.ENABLED !== true) errors.push('jokers must remain enabled in the agreed Euro contract')
  if (!isPositiveNumber(config.joker?.MULTIPLIER)) errors.push('joker.MULTIPLIER must be a positive number')
  if (config.joker?.GROUP_STAGE_CAP !== 5) errors.push('the original group-stage joker cap must be 5')
  if (config.joker?.ORIGINAL_BRACKET_CAP !== 0) errors.push('the original bracket must not allow jokers')
  if (config.joker?.KO_PREDICTOR_CAP !== 5) errors.push('the separate KO Predictor joker cap must be 5')

  return { valid: errors.length === 0, errors }
}
