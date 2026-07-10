/**
 * Calculated group-stage goals total.
 *
 * The locked rules contract states: "Group goals are auto-calculated only from
 * the user's 36 group-score predictions." The Decision Register adds that they
 * "are not manually editable". So this is derived, never stored and never
 * entered — there is deliberately no setter here.
 *
 * See docs/RULES-SCORING-LOCKED-CONTRACT.md.
 */

/**
 * Sum every group-stage score the user has entered.
 *
 * A partially-filled predictor still has a meaningful running total, so this
 * sums what exists rather than refusing until all 36 are in. `complete` says
 * whether the total is final.
 */
export function calculateGroupGoalsTotal(draft, expectedMatches = 36) {
  const rows = Object.values(draft?.groupPredictions ?? {})
  let total = 0
  let entered = 0

  for (const row of rows) {
    if (!Number.isInteger(row.homeScore) || !Number.isInteger(row.awayScore)) continue
    total += row.homeScore + row.awayScore
    entered += 1
  }

  return Object.freeze({
    total,
    entered,
    expected: expectedMatches,
    complete: entered === expectedMatches,
  })
}

import { GROUP_GOALS_TIERS, scoreTotalGoalsPick } from '../contracts/tournamentPickContract.js'

export { GROUP_GOALS_TIERS }

export const GROUP_GOALS_SCORING_STATUS = Object.freeze({
  /** Both totals are in and the tiered points are final. */
  SCORED: 'scored',
  /** The official group-goals total is not yet available, so no points yet. */
  PENDING_RESULT: 'pending_result',
})

/**
 * Tiered group-goals points (owner ruling, CLAUDE.md §4): the user's predicted
 * 36-match group-goal total is compared to the official total; 25 for an exact
 * match, 15 within 5, 5 within 10, else 0. Bands are inclusive by absolute
 * distance (exactly 5 off -> 15, exactly 10 off -> 5, 11 off -> 0).
 *
 * The official total is sum(home_score_90 + away_score_90) over confirmed group
 * results (match_number <= 36); until every group result is confirmed it is not
 * final, so a missing/partial actual total returns PENDING_RESULT with no points.
 */
export function scoreGroupGoalsTotal(predictedTotal, actualTotal) {
  if (!Number.isInteger(predictedTotal) || !Number.isInteger(actualTotal)) {
    return Object.freeze({ status: GROUP_GOALS_SCORING_STATUS.PENDING_RESULT, points: null, distance: null })
  }
  return Object.freeze({
    status: GROUP_GOALS_SCORING_STATUS.SCORED,
    points: scoreTotalGoalsPick(predictedTotal, actualTotal),
    distance: Math.abs(predictedTotal - actualTotal),
  })
}

/**
 * Copy for the read-only Review field. States the mechanic and stops there,
 * because which contract governs the points is still unresolved.
 */
export const GROUP_GOALS_COPY = Object.freeze({
  label: 'Total group-stage goals',
  note: 'Calculated automatically from your 36 group-stage score predictions. Not editable.',
})
