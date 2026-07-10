import { EURO_SCORING_CONFIG } from '../config/scoringConfig.js'

const { PER_CORRECT_POSITION, PERFECT_GROUP_BONUS } = EURO_SCORING_CONFIG.groupPositions

export const GROUP_POSITION_POINTS = EURO_SCORING_CONFIG.groupPositions

/**
 * Score one group's predicted final positions against the actual final table.
 *
 * Positions are ordered teamId arrays (index 0 = 1st place, index 3 = 4th).
 * The user never enters positions directly — they are derived from the group
 * score predictions via resolveGroupTable, then compared to the official final
 * table. Two points per teamId that lands in its actual position, plus a +5
 * bonus when every position in the group is correct (CLAUDE.md §4).
 */
export function calculateGroupPositionPoints(predictedPositions, actualPositions) {
  if (!Array.isArray(predictedPositions) || !Array.isArray(actualPositions) || actualPositions.length === 0) {
    return Object.freeze({ correctPositions: 0, basePoints: 0, perfectGroupBonus: 0, points: 0 })
  }

  let correct = 0
  for (let index = 0; index < actualPositions.length; index += 1) {
    if (predictedPositions[index] != null && predictedPositions[index] === actualPositions[index]) correct += 1
  }

  const basePoints = correct * PER_CORRECT_POSITION
  const perfectGroupBonus = correct === actualPositions.length ? PERFECT_GROUP_BONUS : 0

  return Object.freeze({
    correctPositions: correct,
    basePoints,
    perfectGroupBonus,
    points: basePoints + perfectGroupBonus,
  })
}

/**
 * Sum group-position points across every group. Each entry is
 * { groupCode, predictedPositions, actualPositions }.
 */
export function calculateAllGroupPositionPoints(groups) {
  if (!Array.isArray(groups)) return Object.freeze({ points: 0, byGroup: Object.freeze([]) })

  const byGroup = groups.map(group => Object.freeze({
    groupCode: group.groupCode ?? null,
    ...calculateGroupPositionPoints(group.predictedPositions, group.actualPositions),
  }))

  return Object.freeze({
    points: byGroup.reduce((sum, group) => sum + group.points, 0),
    byGroup: Object.freeze(byGroup),
  })
}
