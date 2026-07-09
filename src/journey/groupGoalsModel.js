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

export const GROUP_GOALS_SCORING_STATUS = Object.freeze({
  /** Points are not implemented. Nothing awards or displays them. */
  NOT_BUILT: 'not_built',
})

/**
 * STUB — group-goals points are not implemented, and must not be guessed at.
 *
 * Three things are missing:
 *
 *   1. No source computes the official group-stage goals total. It would be
 *      sum(home_score_90 + away_score_90) over confirmed match_results for
 *      match_number <= 36, but nothing calculates or stores it.
 *   2. prediction_totals has no column to persist the points, so they could not
 *      influence leaderboard rank, which is dense_rank() over total_points.
 *   3. Two locked contracts disagree on the mechanic. docs/RULES-SCORING-LOCKED-CONTRACT.md
 *      scores tolerance bands (exact 25, within 5 -> 15, within 10 -> 5);
 *      docs/STAGE-13F-I-TOURNAMENT-PICK-CONTRACT.md scores a flat 20 to every
 *      nearest guess. That conflict is unresolved and is an owner decision.
 *
 * Returning null is the honest answer: the UI shows the calculated total and
 * says nothing about points. Do not replace this with a plausible-looking
 * formula — pick (3) first, then build (1) and (2).
 */
export function scoreGroupGoalsTotal() {
  return Object.freeze({ status: GROUP_GOALS_SCORING_STATUS.NOT_BUILT, points: null })
}

/**
 * Copy for the read-only Review field. States the mechanic and stops there,
 * because which contract governs the points is still unresolved.
 */
export const GROUP_GOALS_COPY = Object.freeze({
  label: 'Total group-stage goals',
  note: 'Calculated automatically from your 36 group-stage score predictions. Not editable.',
})
