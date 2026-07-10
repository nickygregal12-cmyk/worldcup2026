import { describe, expect, it } from 'vitest'
import {
  calculateAllGroupPositionPoints,
  calculateGroupPositionPoints,
} from '../groupPositionsModel.js'

const actual = ['wal', 'ger', 'tur', 'geo']

describe('group-position scoring', () => {
  it('awards 2 points per correct position', () => {
    // two positions correct (1st, 3rd), two swapped
    const result = calculateGroupPositionPoints(['wal', 'tur', 'ger', 'geo'], actual)
    expect(result.correctPositions).toBe(2)
    expect(result.basePoints).toBe(4)
    expect(result.perfectGroupBonus).toBe(0)
    expect(result.points).toBe(4)
  })

  it('adds a +5 perfect-group bonus only when all four are correct', () => {
    const perfect = calculateGroupPositionPoints(['wal', 'ger', 'tur', 'geo'], actual)
    expect(perfect.correctPositions).toBe(4)
    expect(perfect.basePoints).toBe(8)
    expect(perfect.perfectGroupBonus).toBe(5)
    expect(perfect.points).toBe(13)
  })

  it('does not award the bonus when three of four are correct', () => {
    // 1st and 2nd correct, 3rd/4th swapped -> only two correct here
    const three = calculateGroupPositionPoints(['wal', 'ger', 'geo', 'tur'], actual)
    expect(three.correctPositions).toBe(2)
    expect(three.points).toBe(4)
  })

  it('scores zero when no positions match', () => {
    const none = calculateGroupPositionPoints(['geo', 'tur', 'ger', 'wal'], actual)
    expect(none.correctPositions).toBe(0)
    expect(none.points).toBe(0)
  })

  it('handles missing or malformed input safely', () => {
    expect(calculateGroupPositionPoints(null, actual).points).toBe(0)
    expect(calculateGroupPositionPoints(['wal'], []).points).toBe(0)
  })

  it('sums across all groups', () => {
    const all = calculateAllGroupPositionPoints([
      { groupCode: 'A', predictedPositions: ['wal', 'ger', 'tur', 'geo'], actualPositions: actual }, // 13
      { groupCode: 'B', predictedPositions: ['eng', 'ned', 'sco', 'nir'], actualPositions: ['eng', 'sco', 'ned', 'nir'] }, // 1st+4th correct = 4
    ])
    expect(all.points).toBe(17)
    expect(all.byGroup[0].points).toBe(13)
    expect(all.byGroup[1].points).toBe(4)
  })
})
