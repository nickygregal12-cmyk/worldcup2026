import { clearStaleBracketSelections, updatePredictionJourneyGroup } from './predictionJourneyModel.js'

export const EURO_LUCKY_DIP_MODE = Object.freeze({
  EMPTY: 'empty',
  REPLACE: 'replace',
})

const SCORE_WEIGHTS = Object.freeze([
  Object.freeze({ homeScore: 0, awayScore: 0, weight: 9 }),
  Object.freeze({ homeScore: 1, awayScore: 0, weight: 14 }),
  Object.freeze({ homeScore: 0, awayScore: 1, weight: 11 }),
  Object.freeze({ homeScore: 1, awayScore: 1, weight: 18 }),
  Object.freeze({ homeScore: 2, awayScore: 0, weight: 10 }),
  Object.freeze({ homeScore: 0, awayScore: 2, weight: 8 }),
  Object.freeze({ homeScore: 2, awayScore: 1, weight: 12 }),
  Object.freeze({ homeScore: 1, awayScore: 2, weight: 10 }),
  Object.freeze({ homeScore: 2, awayScore: 2, weight: 5 }),
  Object.freeze({ homeScore: 3, awayScore: 0, weight: 3 }),
  Object.freeze({ homeScore: 0, awayScore: 3, weight: 2 }),
  Object.freeze({ homeScore: 3, awayScore: 1, weight: 4 }),
  Object.freeze({ homeScore: 1, awayScore: 3, weight: 3 }),
  Object.freeze({ homeScore: 3, awayScore: 2, weight: 2 }),
  Object.freeze({ homeScore: 2, awayScore: 3, weight: 2 }),
  Object.freeze({ homeScore: 4, awayScore: 0, weight: 1 }),
  Object.freeze({ homeScore: 0, awayScore: 4, weight: 1 }),
])

const TOTAL_WEIGHT = SCORE_WEIGHTS.reduce((total, item) => total + item.weight, 0)

export function generateEuroLuckyDipScore(random = Math.random) {
  const value = Number(random())
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new TypeError('Lucky Dip random values must be from 0 up to, but not including, 1')
  }
  let cursor = value * TOTAL_WEIGHT
  for (const score of SCORE_WEIGHTS) {
    cursor -= score.weight
    if (cursor < 0) return Object.freeze({ homeScore: score.homeScore, awayScore: score.awayScore })
  }
  const fallback = SCORE_WEIGHTS[SCORE_WEIGHTS.length - 1]
  return Object.freeze({ homeScore: fallback.homeScore, awayScore: fallback.awayScore })
}

export function applyEuroLuckyDip(reference, draft, {
  mode = EURO_LUCKY_DIP_MODE.EMPTY,
  random = Math.random,
  now,
} = {}) {
  if (!Object.values(EURO_LUCKY_DIP_MODE).includes(mode)) throw new TypeError('Lucky Dip mode is unsupported')

  let next = draft
  let changed = 0
  for (const match of reference.groupMatches) {
    const row = next.groupPredictions[String(match.matchNumber)]
    const complete = row.homeScore != null && row.awayScore != null
    if (mode === EURO_LUCKY_DIP_MODE.EMPTY && complete) continue
    const score = generateEuroLuckyDipScore(random)
    next = updatePredictionJourneyGroup(next, {
      matchNumber: match.matchNumber,
      homeScore: score.homeScore,
      awayScore: score.awayScore,
    }, { now })
    changed += 1
  }

  return Object.freeze({
    draft: clearStaleBracketSelections(reference, next, { now }),
    changed,
  })
}
