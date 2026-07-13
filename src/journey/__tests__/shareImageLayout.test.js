import { describe, expect, it } from 'vitest'
import {
  SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH, SHARE_LAYOUT_MARGIN, TIE_HEIGHT,
  buildShareBands, columnWidth, columnX, feedsRightward, teamNameWidth, tieBox,
} from '../shareImageLayout.js'
import { BRACKET_WALL_TOPOLOGY } from '../bracketWallTopology.js'

// The same topology the live wall chart uses — one placement source, asserted in
// bracketWallTopology.test.js against the resolver itself.
const tree = BRACKET_WALL_TOPOLOGY
const placementOf = matchNumber => tree.placements.get(matchNumber)

describe('share image bands', () => {
  it('fills the canvas exactly, with and without the optional group-scores band', () => {
    for (const includeGroupScores of [true, false]) {
      const bands = buildShareBands({ includeGroupScores })
      const ordered = [bands.header, bands.champion, bands.bracket, bands.stats, bands.groupScores, bands.footer]
      ordered.reduce((y, band) => {
        expect(band.y).toBe(y)
        return y + band.height
      }, 0)
      const total = ordered.reduce((sum, band) => sum + band.height, 0)
      expect(total).toBe(SHARE_IMAGE_HEIGHT)
    }
  })

  it('reclaims the group-scores height for the chart and hero rather than leaving a hole', () => {
    const withScores = buildShareBands({ includeGroupScores: true })
    const without = buildShareBands({ includeGroupScores: false })
    expect(withScores.groupScores.height).toBeGreaterThan(0)
    expect(without.groupScores.height).toBe(0)
    expect(without.bracket.height).toBeGreaterThan(withScores.bracket.height)
    expect(without.footer.height).toBeGreaterThanOrEqual(withScores.footer.height)
  })
})

describe('seven-lane geometry', () => {
  it('fits all seven lanes inside the canvas margins', () => {
    expect(columnX(1)).toBe(SHARE_LAYOUT_MARGIN)
    const right = columnX(7) + columnWidth()
    expect(right).toBeLessThanOrEqual(SHARE_IMAGE_WIDTH - SHARE_LAYOUT_MARGIN)
  })

  it('leaves enough room for the longest UEFA names beside a flag', () => {
    // The three names the brief calls out are the constraint. The model already hands the two
    // longest their broadcast short form ("Rep. Ireland", "N. Ireland"), so the widest string a
    // lane must actually hold is "Netherlands". Real glyph widths are a browser question — this
    // asserts the SPACE exists; the Playwright harness confirms the type fits in it.
    expect(teamNameWidth()).toBeGreaterThanOrEqual(90)
  })

  it('converges: the final is centred, and a parent sits between the ties that feed it', () => {
    const bands = buildShareBands({ includeGroupScores: true })
    const centre = SHARE_IMAGE_WIDTH / 2
    const final = tieBox(placementOf(51), bands.bracket)
    expect(Math.abs(final.x + final.width / 2 - centre)).toBeLessThanOrEqual(1)

    // Quarter-final 45 is fed by R16 ties 39 and 37 (the resolver's pairing, not 37/38), so it
    // must sit exactly between THOSE two — that is what makes the chart read as a bracket.
    const feeders = [39, 37].map(matchNumber => tieBox(placementOf(matchNumber), bands.bracket))
    const quarter = tieBox(placementOf(45), bands.bracket)
    expect(quarter.centreY).toBe(Math.round((feeders[0].centreY + feeders[1].centreY) / 2))

    // And the semis meet the final on one line.
    expect(tieBox(placementOf(49), bands.bracket).centreY).toBe(final.centreY)
    expect(tieBox(placementOf(50), bands.bracket).centreY).toBe(final.centreY)
  })

  it('keeps every tie inside its band, and never overlaps two in a lane', () => {
    const bands = buildShareBands({ includeGroupScores: true })
    const byColumn = new Map()
    for (const [matchNumber, placement] of tree.placements) {
      const box = tieBox(placement, bands.bracket)
      expect(box.y).toBeGreaterThanOrEqual(bands.bracket.y)
      expect(box.y + box.height).toBeLessThanOrEqual(bands.bracket.y + bands.bracket.height)
      byColumn.set(placement.column, [...(byColumn.get(placement.column) ?? []), box])
      void matchNumber
    }
    for (const boxes of byColumn.values()) {
      const ordered = [...boxes].sort((left, right) => left.y - right.y)
      ordered.slice(1).forEach((box, index) => {
        expect(box.y).toBeGreaterThanOrEqual(ordered[index].y + TIE_HEIGHT)
      })
    }
  })

  it('feeds the left lanes rightward and the right lanes leftward', () => {
    expect([1, 2, 3].every(feedsRightward)).toBe(true)
    expect([5, 6, 7].some(feedsRightward)).toBe(false)
  })
})
