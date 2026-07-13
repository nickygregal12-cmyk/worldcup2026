import { describe, expect, it } from 'vitest'
import { BRACKET_WALL_TOPOLOGY, buildBracketWallTopology } from '../bracketWallTopology.js'
import { EURO28_KNOCKOUT_MATCHES } from '../../resolver/euro28ResolverConfig.js'

/**
 * The chart is asserted against the resolver, never against a copy of the answer. If someone
 * re-pairs the knockout bracket, these expectations follow it — which is the entire point of
 * deriving the shape instead of declaring it.
 */
const CANONICAL_EDGES = EURO28_KNOCKOUT_MATCHES.flatMap(match =>
  [match.home, match.away]
    .filter(slot => slot.sourceType === 'match_winner')
    .map(slot => ({ from: slot.matchNumber, to: match.matchNumber })),
)

const topology = BRACKET_WALL_TOPOLOGY
const columnOf = matchNumber => topology.placements.get(matchNumber).column
const halfOf = matchNumber => (columnOf(matchNumber) < 4 ? 'left' : 'right')

describe('bracket wall topology', () => {
  it('draws an edge for every knockout feed the resolver declares, and no others', () => {
    expect(topology.edges.map(edge => `${edge.from}->${edge.to}`).sort())
      .toEqual(CANONICAL_EDGES.map(edge => `${edge.from}->${edge.to}`).sort())
  })

  it('places all fifteen knockout ties', () => {
    expect(topology.placements.size).toBe(15)
  })

  /**
   * The bug this module exists to kill. The old hand-written table put R16 ties 37-40 in the left
   * lane and 41-44 in the right, purely by match number — but the resolver feeds quarter-final 46
   * (a LEFT-side tie, since 46 feeds semi-final 49) from R16 ties 41 and 42. They were drawn on the
   * wrong side of the draw entirely, and 38/40 were the mirror of the same error.
   */
  it('puts every tie on the side of the draw that feeds the quarter-final it is actually fed into', () => {
    for (const { from, to } of CANONICAL_EDGES) {
      if (to === 51) continue // the final is fed from both halves; everything under it picks a side
      expect(halfOf(from), `match ${from} feeds ${to} but sits in the other half`).toBe(halfOf(to))
    }

    // The four ties the old table got wrong, named so a regression cannot hide behind a loop.
    expect(halfOf(41)).toBe('left')
    expect(halfOf(42)).toBe('left')
    expect(halfOf(38)).toBe('right')
    expect(halfOf(40)).toBe('right')
  })

  it('orders each lane top to bottom, in bracket order', () => {
    const lane = key => topology.columns.find(column => column.key === key).matchNumbers
    expect(lane('r16-left')).toEqual([39, 37, 41, 42])
    expect(lane('qf-left')).toEqual([45, 46])
    expect(lane('sf-left')).toEqual([49])
    expect(lane('final-centre')).toEqual([51])
    expect(lane('sf-right')).toEqual([50])
    expect(lane('qf-right')).toEqual([47, 48])
    expect(lane('r16-right')).toEqual([44, 43, 40, 38])
  })

  it('keeps the seven lanes, converging on a centred final', () => {
    expect(topology.columns.map(column => column.key)).toEqual([
      'r16-left', 'qf-left', 'sf-left', 'final-centre', 'sf-right', 'qf-right', 'r16-right',
    ])
    expect(topology.placements.get(51)).toEqual({ column: 4, row: 5 })
  })

  it('centres every parent between the two ties that feed it', () => {
    for (const parent of [45, 46, 47, 48, 49, 50, 51]) {
      const rows = CANONICAL_EDGES
        .filter(edge => edge.to === parent)
        .map(edge => topology.placements.get(edge.from).row)
      expect(topology.placements.get(parent).row).toBe((rows[0] + rows[1]) / 2)
    }
  })

  it('follows the bracket it is given rather than a memorised shape', () => {
    // Swap which R16 ties feed quarter-final 45 and the lane must follow, with no other change.
    const rewired = EURO28_KNOCKOUT_MATCHES.map(match => (
      match.matchNumber === 45
        ? { ...match, home: { sourceType: 'match_winner', matchNumber: 37 }, away: { sourceType: 'match_winner', matchNumber: 39 } }
        : match
    ))
    const swapped = buildBracketWallTopology(rewired)
    expect(swapped.columns.find(column => column.key === 'r16-left').matchNumbers).toEqual([37, 39, 41, 42])
  })

  it('refuses a bracket with no final rather than drawing a wrong one', () => {
    expect(() => buildBracketWallTopology([{ matchNumber: 37, stage: 'round_of_16', home: {}, away: {} }]))
      .toThrow(/no final/)
  })
})
