/**
 * Where each tie sits on the share card's converging chart — derived from the bracket's OWN edges,
 * not from a table of match numbers.
 *
 * This exists because the live page's `WALL_PLACEMENT` and the canonical resolver disagree, and
 * the share card is the first thing that draws connector lines, so it is the first thing that can
 * see the disagreement.
 *
 * The resolver (EURO28_KNOCKOUT_MATCHES) pairs the quarter-finals like this:
 *
 *     45 <- 39, 37        46 <- 41, 42        47 <- 44, 43        48 <- 40, 38
 *     49 <- 45, 46        50 <- 47, 48        51 <- 49, 50
 *
 * So the half of the draw that reaches semi-final 49 contains R16 ties 39, 37, 41 and 42 — while
 * `WALL_PLACEMENT` puts 37-40 in the left R16 lane and 41-44 in the right one, purely by number.
 * Ties 41 and 42 feed a LEFT-side quarter-final but are drawn on the RIGHT. The live chart gets
 * away with it because it draws no lines between lanes; a wall chart that does would show ties
 * crossing the full width of the card to reach their own quarter-final.
 *
 * Rather than restate the pairings here (a second source of truth is how the first one rotted),
 * the tree is read off the ties themselves: a `W45` slot source code IS the edge. Feed this the
 * canonical bracket and it produces the canonical shape, whatever the resolver says today.
 *
 * Reported to the owner as an advisory finding; the live page is deliberately NOT changed here.
 */
const WINNER_MATCH = /^W(\d+)$/

/** Left half reads 1-2-3, the final is 4, the right half mirrors back out through 5-6-7. */
const LEFT_COLUMNS = Object.freeze({ round_of_16: 1, quarter_final: 2, semi_final: 3 })
const RIGHT_COLUMNS = Object.freeze({ round_of_16: 7, quarter_final: 6, semi_final: 5 })
const FINAL_COLUMN = 4

/** The eight R16 slots, top to bottom, on the same pitch each side. Parents centre between them. */
const LEAF_ROWS = Object.freeze([2, 4, 6, 8])

export const SHARE_COLUMN_LABELS = Object.freeze([
  Object.freeze({ column: 1, label: 'R16' }),
  Object.freeze({ column: 2, label: 'QF' }),
  Object.freeze({ column: 3, label: 'SF' }),
  Object.freeze({ column: 4, label: 'Final' }),
  Object.freeze({ column: 5, label: 'SF' }),
  Object.freeze({ column: 6, label: 'QF' }),
  Object.freeze({ column: 7, label: 'R16' }),
])

function childrenOf(tie) {
  return tie.slots
    .map(slot => WINNER_MATCH.exec(slot.sourceCode ?? ''))
    .filter(Boolean)
    .map(match => Number(match[1]))
}

/**
 * @returns {{ placements: Map<number, {column:number,row:number}>, edges: Array<{from:number,to:number}> }}
 */
export function buildShareBracketTree(tiesByMatchNumber) {
  const ties = Object.values(tiesByMatchNumber)
  const final = ties.find(tie => tie.stage === 'final')
  if (!final) throw new Error('The bracket has no final — the share chart cannot be built')

  const placements = new Map()
  const edges = []

  const [leftSemi, rightSemi] = childrenOf(final)

  // Depth-first from a semi-final down to its four R16 ties, laying the leaves out in the order
  // the tree visits them. A parent then sits exactly between the two ties it is fed by, which is
  // what makes the chart converge without anyone having to say where the lines go.
  const placeHalf = (semiNumber, columns) => {
    const semi = tiesByMatchNumber[semiNumber]
    const quarters = childrenOf(semi)
    const quarterRows = []

    quarters.forEach((quarterNumber, quarterIndex) => {
      const quarter = tiesByMatchNumber[quarterNumber]
      const roundOf16 = childrenOf(quarter)
      const leafRows = roundOf16.map((_, leafIndex) => LEAF_ROWS[quarterIndex * 2 + leafIndex])

      roundOf16.forEach((leafNumber, leafIndex) => {
        placements.set(leafNumber, { column: columns.round_of_16, row: leafRows[leafIndex] })
        edges.push({ from: leafNumber, to: quarterNumber })
      })

      const quarterRow = (leafRows[0] + leafRows[1]) / 2
      placements.set(quarterNumber, { column: columns.quarter_final, row: quarterRow })
      quarterRows.push(quarterRow)
      edges.push({ from: quarterNumber, to: semiNumber })
    })

    placements.set(semiNumber, {
      column: columns.semi_final,
      row: (quarterRows[0] + quarterRows[1]) / 2,
    })
    edges.push({ from: semiNumber, to: final.matchNumber })
  }

  placeHalf(leftSemi, LEFT_COLUMNS)
  placeHalf(rightSemi, RIGHT_COLUMNS)
  placements.set(final.matchNumber, { column: FINAL_COLUMN, row: (LEAF_ROWS[0] + LEAF_ROWS[3]) / 2 })

  return { placements, edges }
}
