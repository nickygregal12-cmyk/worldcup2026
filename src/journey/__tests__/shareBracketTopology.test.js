import { describe, expect, it } from 'vitest'
import { SHARE_COLUMN_LABELS, buildShareBracketTree } from '../shareBracketTopology.js'
import { buildBracketShareModel } from '../shareImageModel.js'
import { VISUAL_BRACKET_DRAFT, VISUAL_GROUP_REFERENCE } from '../../testFixtures/visualFixture.js'
import { resolveGuestTournamentPreview } from '../../guest/index.js'
import { EURO28_KNOCKOUT_MATCHES } from '../../resolver/euro28ResolverConfig.js'

const reference = VISUAL_GROUP_REFERENCE
const model = buildBracketShareModel({
  reference,
  draft: VISUAL_BRACKET_DRAFT,
  preview: resolveGuestTournamentPreview(reference, VISUAL_BRACKET_DRAFT),
})
const tree = buildShareBracketTree(model.tiesByMatchNumber)

/** The canonical pairings, read straight off the resolver rather than restated. */
const CANONICAL_EDGES = EURO28_KNOCKOUT_MATCHES.flatMap(match =>
  [match.home, match.away]
    .filter(slot => slot.sourceType === 'match_winner')
    .map(slot => ({ from: slot.matchNumber, to: match.matchNumber })),
)

describe('share bracket topology', () => {
  it('draws an edge for every knockout feed the resolver declares, and no others', () => {
    const actual = tree.edges.map(edge => `${edge.from}->${edge.to}`).sort()
    const expected = CANONICAL_EDGES.map(edge => `${edge.from}->${edge.to}`).sort()
    expect(actual).toEqual(expected)
  })

  it('places all fifteen ties', () => {
    expect(tree.placements.size).toBe(15)
  })

  /**
   * The reason this module exists. The live page's WALL_PLACEMENT puts R16 ties in lanes by match
   * number — 37-40 left, 41-44 right — but the resolver feeds quarter-final 46 (a LEFT-side tie,
   * since 46 feeds semi-final 49) from R16 ties 41 and 42. Group the ties by the half of the draw
   * they actually belong to and 41/42 land on the left, which is what a bracket has to show.
   */
  it('puts every tie in the half of the draw it actually feeds', () => {
    const columnOf = matchNumber => tree.placements.get(matchNumber).column
    const half = matchNumber => (columnOf(matchNumber) < 4 ? 'left' : 'right')

    for (const { from, to } of CANONICAL_EDGES) {
      // The final is fed from both halves; everything below it must stay on one side.
      if (to === 51) continue
      expect(half(from), `match ${from} feeds ${to} but sits in the other half`).toBe(half(to))
    }

    // And specifically the ties that expose the live page's lane order.
    expect(half(41)).toBe('left')
    expect(half(42)).toBe('left')
    expect(half(38)).toBe('right')
    expect(half(40)).toBe('right')
  })

  it('steps each round inward toward a centred final', () => {
    const round = stage => [...tree.placements.entries()]
      .filter(([matchNumber]) => model.tiesByMatchNumber[matchNumber].stage === stage)
      .map(([, placement]) => placement)

    expect(round('final').map(placement => placement.column)).toEqual([4])
    expect(round('semi_final').map(placement => placement.column).sort()).toEqual([3, 5])
    expect(round('quarter_final').map(placement => placement.column).sort()).toEqual([2, 2, 6, 6])
    expect(round('round_of_16').map(placement => placement.column).sort()).toEqual([1, 1, 1, 1, 7, 7, 7, 7])
  })

  it('centres every parent between the two ties that feed it', () => {
    for (const parent of [45, 46, 47, 48, 49, 50, 51]) {
      const children = CANONICAL_EDGES.filter(edge => edge.to === parent).map(edge => edge.from)
      const rows = children.map(child => tree.placements.get(child).row)
      expect(tree.placements.get(parent).row).toBe((rows[0] + rows[1]) / 2)
    }
  })

  it('labels the seven lanes outward from the final', () => {
    expect(SHARE_COLUMN_LABELS.map(column => column.label)).toEqual(['R16', 'QF', 'SF', 'Final', 'SF', 'QF', 'R16'])
  })

  it('refuses a bracket with no final rather than drawing a wrong one', () => {
    expect(() => buildShareBracketTree({ 37: { matchNumber: 37, stage: 'round_of_16', slots: [] } }))
      .toThrow(/no final/)
  })
})
