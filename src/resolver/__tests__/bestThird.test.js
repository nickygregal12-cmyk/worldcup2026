import { describe, expect, it } from 'vitest'
import {
  buildBestThirdCombinationKey,
  rankBestThirdTeams,
  resolveBestThirdAssignments,
} from '../bestThird.js'
import {
  EURO28_BEST_THIRD_COMBINATIONS,
  EURO28_BEST_THIRD_MATRIX,
  EURO28_BEST_THIRD_TARGET_MATCHES,
  EURO28_GROUP_CODES,
} from '../euro28ResolverConfig.js'

function thirdsForCombination(combinationKey) {
  return combinationKey.split('').map(groupCode => ({
    groupCode,
    teamId: `${groupCode}3`,
  }))
}

function buildThirdPlaceTables() {
  const points = { A: 7, B: 6, C: 5, D: 4, E: 3, F: 2 }
  return Object.fromEntries(EURO28_GROUP_CODES.map(code => [code, {
    rows: [
      { rank: 1, teamId: `${code}1`, points: 9, goalDifference: 5, goalsFor: 6, wins: 3 },
      { rank: 2, teamId: `${code}2`, points: 8, goalDifference: 4, goalsFor: 5, wins: 2 },
      {
        rank: 3,
        teamId: `${code}3`,
        stableKey: `${code}3`,
        points: points[code],
        goalDifference: points[code] - 4,
        goalsFor: points[code],
        wins: Math.max(0, points[code] - 4),
        qualifierRank: EURO28_GROUP_CODES.indexOf(code) + 1,
      },
      { rank: 4, teamId: `${code}4`, points: 0, goalDifference: -5, goalsFor: 0, wins: 0 },
    ],
  }]))
}

describe('best-third combination handling', () => {
  it('contains all 15 possible combinations exactly once', () => {
    expect(EURO28_BEST_THIRD_COMBINATIONS).toHaveLength(15)
    expect(new Set(EURO28_BEST_THIRD_COMBINATIONS).size).toBe(15)
  })

  it.each(EURO28_BEST_THIRD_COMBINATIONS)(
    'allocates combination %s exactly once across the four designated round-of-16 matches',
    combinationKey => {
      const resolved = resolveBestThirdAssignments(thirdsForCombination(combinationKey))
      const rows = Object.values(resolved.assignmentsByMatch)

      expect(resolved.combinationKey).toBe(combinationKey)
      expect(rows.map(row => row.thirdPlaceGroup).sort().join('')).toBe(combinationKey)
      expect(rows.map(row => row.matchNumber).sort((a, b) => a - b)).toEqual([39, 40, 41, 44])

      for (const targetGroupWinner of ['B', 'C', 'F', 'E']) {
        const matchNumber = EURO28_BEST_THIRD_TARGET_MATCHES[targetGroupWinner]
        expect(resolved.assignmentsByMatch[matchNumber].thirdPlaceGroup)
          .toBe(EURO28_BEST_THIRD_MATRIX[targetGroupWinner][combinationKey])
      }
    },
  )

  it('rejects duplicate, incomplete and unsupported combinations', () => {
    expect(() => buildBestThirdCombinationKey(['A', 'B', 'C'])).toThrow('Exactly four')
    expect(() => buildBestThirdCombinationKey(['A', 'A', 'B', 'C'])).toThrow('four unique')
    expect(() => buildBestThirdCombinationKey(['A', 'B', 'C', 'G'])).toThrow('four unique')
  })
})

describe('best-third ranking', () => {
  it('ranks the six third-place teams and selects the top four', () => {
    const ranked = rankBestThirdTeams(buildThirdPlaceTables())

    expect(ranked.ranking.map(row => row.groupCode)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    expect(ranked.qualifiedThirds.map(row => row.groupCode)).toEqual(['A', 'B', 'C', 'D'])
    expect(ranked.combinationKey).toBe('ABCD')
  })

  it('uses the stable preview fallback only when the supplied criteria remain tied', () => {
    const tables = buildThirdPlaceTables()
    for (const code of EURO28_GROUP_CODES) {
      tables[code].rows[2] = {
        ...tables[code].rows[2],
        points: 3,
        goalDifference: 0,
        goalsFor: 2,
        wins: 1,
        qualifierRank: null,
      }
    }

    const ranked = rankBestThirdTeams(tables)
    expect(ranked.ranking.map(row => row.groupCode)).toEqual(EURO28_GROUP_CODES)
    expect(ranked.unresolvedTieGroups).toHaveLength(1)
    expect(ranked.ranking.every(row => row.previewFallbackUsed)).toBe(true)
  })
})
