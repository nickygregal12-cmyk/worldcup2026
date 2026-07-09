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
  version: 'euro28-scoring-provisional-v2',
  status: SCORING_CONFIG_STATUS.PROVISIONAL,
  match: Object.freeze({
    EXACT_SCORE: 30,
    CORRECT_OUTCOME: 10,
  }),
  koPredictor: Object.freeze({
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
    GROUP_STAGE_CAP: 5,
    ORIGINAL_BRACKET_CAP: 0,
    KO_PREDICTOR_CAP: 5,
  }),
})

export const SCORING_SOURCE = Object.freeze({
  DATABASE: 'database',
  CENTRAL_PROVISIONAL: 'central-provisional',
})

function integerOrNull(value) {
  return Number.isInteger(value) ? value : null
}

/**
 * Map a public.scoring_rulesets row into the client scoring shape. The database
 * is what SQL scoring actually awards from, so mapped values flow to display
 * even when they violate the agreed contract — validateScoringConfig runs on
 * the result and its errors are surfaced, never silently corrected.
 */
export function mapScoringRulesetRow(row) {
  if (!row || typeof row !== 'object') return null
  return Object.freeze({
    version: row.ruleset_key ?? 'unknown-ruleset',
    status: row.status === 'locked' ? SCORING_CONFIG_STATUS.LOCKED : SCORING_CONFIG_STATUS.PROVISIONAL,
    match: Object.freeze({
      EXACT_SCORE: integerOrNull(row.match_exact_score_points),
      CORRECT_OUTCOME: integerOrNull(row.match_correct_outcome_points),
    }),
    koPredictor: Object.freeze({
      CORRECT_ADVANCING_TEAM: integerOrNull(row.knockout_advancing_team_points),
      CORRECT_DECISION_METHOD: integerOrNull(row.knockout_decision_method_points),
    }),
    bracket: Object.freeze({
      round_of_16: integerOrNull(row.round_of_16_team_points),
      quarter_final: integerOrNull(row.quarter_final_team_points),
      semi_final: integerOrNull(row.semi_final_team_points),
      final: integerOrNull(row.finalist_points),
      champion: integerOrNull(row.champion_points),
    }),
    joker: Object.freeze({
      ENABLED: true,
      MULTIPLIER: Number(row.joker_multiplier),
      GROUP_STAGE_CAP: integerOrNull(row.group_stage_joker_cap),
      // Bracket jokers do not exist in the database schema at all — zero is the
      // structural rule, not a copied value.
      ORIGINAL_BRACKET_CAP: 0,
      KO_PREDICTOR_CAP: integerOrNull(row.knockout_joker_cap),
    }),
  })
}

/**
 * Resolve the scoring values the app should display, with provenance — the
 * same fail-loud pattern as resolveTournamentLifecycle's dates: database rows
 * flow as truth; the central config only flows as a labelled provisional
 * fallback and never masquerades as the configured ruleset.
 */
export function resolveActiveScoring(rulesetRow = null) {
  const mapped = mapScoringRulesetRow(rulesetRow)
  const values = mapped ?? EURO_SCORING_CONFIG
  const validation = validateScoringConfig(values)
  return Object.freeze({
    values,
    source: mapped ? SCORING_SOURCE.DATABASE : SCORING_SOURCE.CENTRAL_PROVISIONAL,
    provisional: !mapped,
    rulesetKey: mapped ? values.version : null,
    valid: validation.valid,
    errors: Object.freeze(validation.errors),
  })
}

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
    ['koPredictor.CORRECT_ADVANCING_TEAM', config.koPredictor?.CORRECT_ADVANCING_TEAM],
    ['koPredictor.CORRECT_DECISION_METHOD', config.koPredictor?.CORRECT_DECISION_METHOD],
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
