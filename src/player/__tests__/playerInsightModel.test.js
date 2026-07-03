import { describe, expect, it } from 'vitest'
import { buildPlayerInsight } from '../playerInsightModel.js'

function points(overrides = {}) {
  return {
    state: 'scored',
    memberUserId: 'user-2',
    displayName: 'Amy',
    totalPoints: 145,
    scoredMatchCount: 3,
    matchBreakdown: [
      {
        matchId: 'm1', matchNumber: 1, matchday: 1, totalPoints: 30,
        exactScorePoints: 30, correctOutcomePoints: 0, advancingTeamPoints: 0,
        decisionMethodPoints: 0, jokerMultiplier: 1, jokerBonus: 0, corrected: false,
      },
      {
        matchId: 'm2', matchNumber: 13, matchday: 2, totalPoints: 20,
        exactScorePoints: 0, correctOutcomePoints: 10, advancingTeamPoints: 0,
        decisionMethodPoints: 0, jokerMultiplier: 2, jokerBonus: 10, corrected: true,
      },
      {
        matchId: 'm3', matchNumber: 25, matchday: 3, totalPoints: 0,
        exactScorePoints: 0, correctOutcomePoints: 0, advancingTeamPoints: 0,
        decisionMethodPoints: 0, jokerMultiplier: 1, jokerBonus: 0, corrected: false,
      },
    ],
    bracketBreakdown: [
      { milestone: 'champion', tournamentTeamId: 'team-1', teamLabel: 'Scotland', points: 95 },
    ],
    ...overrides,
  }
}

describe('player insight model', () => {
  it('builds rank, source, matchday, streak and correction stories from canonical rows', () => {
    const insight = buildPlayerInsight({
      points: points(),
      memberUserId: 'user-2',
      competitionKey: 'original',
      leaderboardRows: [
        { userId: 'user-1', rank: 1, totalPoints: 170 },
        { userId: 'user-2', rank: 2, totalPoints: 145 },
        { userId: 'user-3', rank: 3, totalPoints: 130 },
      ],
    })

    expect(insight.rank).toMatchObject({
      rank: 2,
      pointsBehindLeader: 25,
      pointsToNextScore: 25,
      isLeader: false,
    })
    expect(insight.sources).toMatchObject({
      exactScore: 30,
      correctOutcome: 10,
      jokerBonus: 10,
      bracket: 95,
      unallocatedPoints: 0,
    })
    expect(insight.statistics).toMatchObject({
      exactScores: 1,
      correctResults: 2,
      successfulJokers: 1,
      correctedMatches: 1,
      longestScoringStreak: 2,
    })
    expect(insight.periods.map(period => period.label)).toEqual([
      'Group matchday 1', 'Group matchday 2', 'Group matchday 3',
    ])
    expect(insight.bestCalls).toHaveLength(1)
    expect(insight.bestCalls[0].matchNumber).toBe(1)
  })

  it('keeps KO-only point sources separate from Original bracket points', () => {
    const insight = buildPlayerInsight({
      points: points({
        totalPoints: 90,
        scoredMatchCount: 1,
        matchBreakdown: [{
          matchId: 'm37', matchNumber: 37, totalPoints: 90,
          exactScorePoints: 30, correctOutcomePoints: 0, advancingTeamPoints: 10,
          decisionMethodPoints: 5, jokerMultiplier: 2, jokerBonus: 45, corrected: false,
        }],
        bracketBreakdown: [],
      }),
      memberUserId: 'user-2',
      competitionKey: 'ko_predictor',
      leaderboardRows: [{ userId: 'user-2', rank: 1, totalPoints: 90 }],
    })

    expect(insight.sources).toMatchObject({
      exactScore: 30,
      advancingTeam: 10,
      decisionMethod: 5,
      jokerBonus: 45,
      bracket: 0,
    })
    expect(insight.periods[0].label).toBe('Round of 16')
  })

  it('preserves public rank context while protected point evidence remains hidden', () => {
    const insight = buildPlayerInsight({
      points: points({ state: 'protected', totalPoints: 0, matchBreakdown: [], bracketBreakdown: [], reason: 'Private until lock.' }),
      memberUserId: 'user-2',
      competitionKey: 'original',
      leaderboardRows: [{ userId: 'user-2', rank: 2, totalPoints: 40 }],
    })

    expect(insight.state).toBe('protected')
    expect(insight.reason).toBe('Private until lock.')
    expect(insight.rank.totalPoints).toBe(40)
    expect(insight.matchRows).toEqual([])
  })
})
