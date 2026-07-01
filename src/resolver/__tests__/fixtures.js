import { EURO28_GROUP_CODES } from '../euro28ResolverConfig.js'

export function buildGroups() {
  return EURO28_GROUP_CODES.map((code, groupIndex) => ({
    code,
    teams: [1, 2, 3, 4].map(position => ({
      teamId: `${code}${position}`,
      slotCode: `${code}${position}`,
      stableKey: `${code}${position}`,
      qualifierRank: (groupIndex * 4) + position,
    })),
  }))
}

const DEFAULT_GROUP_RESULTS = Object.freeze([
  [1, 2, 3, 0],
  [3, 4, 2, 0],
  [1, 3, 2, 0],
  [2, 4, 1, 0],
  [4, 1, 0, 1],
  [2, 3, 1, 0],
])

export function buildGroupMatches(context, { scoresByGroup = {} } = {}) {
  let matchNumber = 1
  const matches = []

  for (const code of EURO28_GROUP_CODES) {
    const results = scoresByGroup[code] ?? DEFAULT_GROUP_RESULTS
    for (const [homePosition, awayPosition, homeScore, awayScore] of results) {
      matches.push({
        context,
        matchNumber,
        groupCode: code,
        homeTeamId: `${code}${homePosition}`,
        awayTeamId: `${code}${awayPosition}`,
        homeScore,
        awayScore,
      })
      matchNumber += 1
    }
  }

  return matches
}

export function buildManualGroupTables() {
  return Object.fromEntries(EURO28_GROUP_CODES.map(code => [code, {
    groupCode: code,
    rows: [1, 2, 3, 4].map(rank => ({
      rank,
      teamId: `${code}${rank}`,
      stableKey: `${code}${rank}`,
      points: 10 - rank,
      goalDifference: 5 - rank,
      goalsFor: 6 - rank,
      wins: 4 - rank,
      fairPlayPoints: rank,
      qualifierRank: rank,
    })),
  }]))
}

export function buildAllHomeKnockoutDecisions(context) {
  return [
    [37, 'A1'], [38, 'A2'], [39, 'B1'], [40, 'C1'],
    [41, 'F1'], [42, 'D2'], [43, 'D1'], [44, 'E1'],
    [45, 'B1'], [46, 'F1'], [47, 'E1'], [48, 'C1'],
    [49, 'B1'], [50, 'E1'], [51, 'B1'],
  ].map(([matchNumber, advancingTeamId]) => ({
    context,
    matchNumber,
    advancingTeamId,
  }))
}
