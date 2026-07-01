/**
 * Single source of truth for Euro 2028 scoring values and joker limits.
 *
 * The scoring categories are agreed, while the numeric values and joker caps
 * remain provisional until the ruleset is formally approved. Every active
 * calculator, rules screen and future server-side scoring job must consume
 * this configuration rather than copying values.
 */
export const SCORING_CONFIG_STATUS = Object.freeze({
  PROVISIONAL: 'provisional',
  LOCKED: 'locked',
})

export const EURO_SCORING_CONFIG = Object.freeze({
  version: 'euro28-scoring-provisional-v2',
  status: SCORING_CONFIG_STATUS.PROVISIONAL,
  match: Object.freeze({
    EXACT_SCORE: 30,
    CORRECT_OUTCOME: 10,
  }),
  knockout: Object.freeze({
    CORRECT_ADVANCING_TEAM: 10,
    CORRECT_DECISION_METHOD: 5,
  }),
  bracket: Object.freeze({
    round_of_16: 10,
    quarter_final: 15,
    semi_final: 20,
    final: 25,
    champion: 50,
  }),
  joker: Object.freeze({
    ENABLED: true,
    MULTIPLIER: 2,
    GROUP_STAGE_CAP: null,
    KNOCKOUT_CAP: null,
  }),
})

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0
}

function isPositiveNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNullableNonNegativeInteger(value) {
  return value === null || isNonNegativeInteger(value)
}

export function validateScoringConfig(config = EURO_SCORING_CONFIG) {
  const errors = []

  if (!config || typeof config !== 'object') return { valid: false, errors: ['scoring config is required'] }
  if (typeof config.version !== 'string' || config.version.trim() === '') errors.push('version is required')
  if (!Object.values(SCORING_CONFIG_STATUS).includes(config.status)) errors.push('status must be provisional or locked')

  const values = [
    ['match.EXACT_SCORE', config.match?.EXACT_SCORE],
    ['match.CORRECT_OUTCOME', config.match?.CORRECT_OUTCOME],
    ['knockout.CORRECT_ADVANCING_TEAM', config.knockout?.CORRECT_ADVANCING_TEAM],
    ['knockout.CORRECT_DECISION_METHOD', config.knockout?.CORRECT_DECISION_METHOD],
    ['bracket.round_of_16', config.bracket?.round_of_16],
    ['bracket.quarter_final', config.bracket?.quarter_final],
    ['bracket.semi_final', config.bracket?.semi_final],
    ['bracket.final', config.bracket?.final],
    ['bracket.champion', config.bracket?.champion],
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
  if (!isNullableNonNegativeInteger(config.joker?.GROUP_STAGE_CAP)) {
    errors.push('joker.GROUP_STAGE_CAP must be null or a non-negative integer')
  }
  if (!isNullableNonNegativeInteger(config.joker?.KNOCKOUT_CAP)) {
    errors.push('joker.KNOCKOUT_CAP must be null or a non-negative integer')
  }

  return { valid: errors.length === 0, errors }
}
