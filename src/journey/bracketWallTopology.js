/**
 * The shape of the knockout wall chart — derived from the canonical resolver, once, for everyone.
 *
 * WHY THIS FILE EXISTS (owner ruling 2026-07-13).
 *
 * The lanes used to be a hand-written table. `ORIGINAL_BRACKET_WALL_COLUMNS` put R16 ties 37-40 in
 * the left lane and 41-44 in the right, purely by match NUMBER, and `WALL_PLACEMENT` restated the
 * same assumption as a grid of coordinates. The resolver disagrees, and always has:
 *
 *     45 <- 39, 37     46 <- 41, 42     47 <- 44, 43     48 <- 40, 38
 *     49 <- 45, 46     50 <- 47, 48     51 <- 49, 50
 *
 * The half of the draw that reaches semi-final 49 therefore holds R16 ties 39, 37, 41 and 42 — so
 * ties 41 and 42 feed a LEFT-side quarter-final while the old table drew them on the RIGHT, and 38
 * and 40 were the mirror of the same error. The chart was not a bracket: the two ties beside a
 * quarter-final were not the ties that fed it.
 *
 * It survived because the live chart draws no lines BETWEEN lanes — it is seven columns of cards,
 * and nothing in it can tell you which tie feeds which, so nothing could contradict the table. The
 * share image was the first surface to draw real connectors, and it fell apart immediately: ties
 * ran the full width of the card to reach their own quarter-final.
 *
 * So the table is gone. The shape is READ OFF the bracket instead: a `matchWinner(39)` slot IS the
 * edge from 39, and the tree is built from those edges. There is now one placement source, and it
 * cannot drift from the resolver because it has no opinion of its own — feed it a different
 * bracket and it draws that bracket.
 */
import { EURO28_KNOCKOUT_MATCHES } from '../resolver/euro28ResolverConfig.js'

/** Left half reads inward 1-2-3, the final is 4, the right half mirrors back out through 5-6-7. */
const LEFT_COLUMNS = Object.freeze({ round_of_16: 1, quarter_final: 2, semi_final: 3 })
const RIGHT_COLUMNS = Object.freeze({ round_of_16: 7, quarter_final: 6, semi_final: 5 })
const FINAL_COLUMN = 4

/** The four R16 rows each side. Every parent centres between the two ties that feed it. */
const LEAF_ROWS = Object.freeze([2, 4, 6, 8])

const COLUMN_IDENTITY = Object.freeze({
  1: Object.freeze({ key: 'r16-left', label: 'Round of 16', shortLabel: 'R16' }),
  2: Object.freeze({ key: 'qf-left', label: 'Quarter-finals', shortLabel: 'QF' }),
  3: Object.freeze({ key: 'sf-left', label: 'Semi-final', shortLabel: 'SF' }),
  4: Object.freeze({ key: 'final-centre', label: 'Final', shortLabel: 'F' }),
  5: Object.freeze({ key: 'sf-right', label: 'Semi-final', shortLabel: 'SF' }),
  6: Object.freeze({ key: 'qf-right', label: 'Quarter-finals', shortLabel: 'QF' }),
  7: Object.freeze({ key: 'r16-right', label: 'Round of 16', shortLabel: 'R16' }),
})

/** The ties a tie is fed by, straight off its own slot sources. This is the only edge definition. */
function feederMatchNumbers(match) {
  return [match.home, match.away]
    .filter(slot => slot.sourceType === 'match_winner')
    .map(slot => slot.matchNumber)
}

export function buildBracketWallTopology(knockoutMatches) {
  const byNumber = new Map(knockoutMatches.map(match => [match.matchNumber, match]))
  const final = knockoutMatches.find(match => match.stage === 'final')
  if (!final) throw new Error('The knockout bracket has no final — the wall chart cannot be built')

  const placements = new Map()
  const edges = []

  // Depth-first from a semi-final down to its four R16 ties, laying the leaves out in the order the
  // tree visits them. A quarter-final then sits exactly between the pair it is fed by because row 3
  // is the mean of rows 2 and 4 — the chart converges without anyone stating where the lines go.
  const placeHalf = (semiNumber, columns) => {
    const quarters = feederMatchNumbers(byNumber.get(semiNumber))
    const quarterRows = []

    quarters.forEach((quarterNumber, quarterIndex) => {
      const feeders = feederMatchNumbers(byNumber.get(quarterNumber))
      const rows = feeders.map((_, feederIndex) => LEAF_ROWS[quarterIndex * 2 + feederIndex])

      feeders.forEach((feederNumber, feederIndex) => {
        placements.set(feederNumber, Object.freeze({ column: columns.round_of_16, row: rows[feederIndex] }))
        edges.push(Object.freeze({ from: feederNumber, to: quarterNumber }))
      })

      const quarterRow = (rows[0] + rows[1]) / 2
      placements.set(quarterNumber, Object.freeze({ column: columns.quarter_final, row: quarterRow }))
      quarterRows.push(quarterRow)
      edges.push(Object.freeze({ from: quarterNumber, to: semiNumber }))
    })

    placements.set(semiNumber, Object.freeze({
      column: columns.semi_final,
      row: (quarterRows[0] + quarterRows[1]) / 2,
    }))
    edges.push(Object.freeze({ from: semiNumber, to: final.matchNumber }))
  }

  const [leftSemi, rightSemi] = feederMatchNumbers(final)
  placeHalf(leftSemi, LEFT_COLUMNS)
  placeHalf(rightSemi, RIGHT_COLUMNS)
  placements.set(final.matchNumber, Object.freeze({
    column: FINAL_COLUMN,
    row: (LEAF_ROWS[0] + LEAF_ROWS[LEAF_ROWS.length - 1]) / 2,
  }))

  // A lane, top to bottom. The order is the chart's own — it is what makes a quarter-final sit
  // between its two feeders — so the lane list and the grid rows cannot disagree.
  const columns = Object.entries(COLUMN_IDENTITY).map(([columnIndex, identity]) => {
    const column = Number(columnIndex)
    const matchNumbers = [...placements.entries()]
      .filter(([, placement]) => placement.column === column)
      .sort((left, right) => left[1].row - right[1].row)
      .map(([matchNumber]) => matchNumber)
    return Object.freeze({ ...identity, column, matchNumbers: Object.freeze(matchNumbers) })
  })

  return Object.freeze({
    placements,
    edges: Object.freeze(edges),
    columns: Object.freeze(columns),
  })
}

export const BRACKET_WALL_TOPOLOGY = buildBracketWallTopology(EURO28_KNOCKOUT_MATCHES)
