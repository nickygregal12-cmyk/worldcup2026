import { describe, expect, it } from 'vitest'
import { buildPlayerInsight, buildPlayerInsightLifecycle } from '../playerInsightModel.js'

function points(overrides = {}) {
  return {
    state: 'scored',
    memberUserId: 'user-2',
    displayName: 'Amy',
    totalPoints: 58,
    scoredMatchCount: 3,
    matchBreakdown: [
      {
        matchId: 'm1', matchNumber: 1, matchday: 1, totalPoints: 10,
        exactScorePoints: 5, correctOutcomePoints: 0, advancingTeamPoints: 0,
        decisionMethodPoints: 0, jokerMultiplier: 2, jokerBonus: 5, corrected: false,
      },
      {
        matchId: 'm2', matchNumber: 13, matchday: 2, totalPoints: 3,
        exactScorePoints: 0, correctOutcomePoints: 3, advancingTeamPoints: 0,
        decisionMethodPoints: 0, jokerMultiplier: 1, jokerBonus: 0, corrected: true,
      },
      {
        matchId: 'm3', matchNumber: 25, matchday: 3, totalPoints: 0,
        exactScorePoints: 0, correctOutcomePoints: 0, advancingTeamPoints: 0,
        decisionMethodPoints: 0, jokerMultiplier: 1, jokerBonus: 0, corrected: false,
      },
    ],
    bracketBreakdown: [
      { milestone: 'champion', tournamentTeamId: 'team-1', teamLabel: 'Scotland', points: 45 },
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
        { userId: 'user-1', rank: 1, totalPoints: 83 },
        { userId: 'user-2', rank: 2, totalPoints: 58 },
        { userId: 'user-3', rank: 3, totalPoints: 33 },
      ],
    })

    expect(insight.rank).toMatchObject({
      rank: 2,
      pointsBehindLeader: 25,
      pointsToNextScore: 25,
      isLeader: false,
    })
    expect(insight.sources).toMatchObject({
      exactScore: 5,
      correctOutcome: 3,
      jokerBonus: 5,
      bracket: 45,
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
        totalPoints: 30,
        scoredMatchCount: 1,
        matchBreakdown: [{
          matchId: 'm37', matchNumber: 37, totalPoints: 30,
          exactScorePoints: 5, correctOutcomePoints: 0, advancingTeamPoints: 5,
          decisionMethodPoints: 5, jokerMultiplier: 2, jokerBonus: 15, corrected: false,
        }],
        bracketBreakdown: [],
      }),
      memberUserId: 'user-2',
      competitionKey: 'ko_predictor',
      leaderboardRows: [{ userId: 'user-2', rank: 1, totalPoints: 30 }],
    })

    expect(insight.sources).toMatchObject({
      exactScore: 5,
      advancingTeam: 5,
      decisionMethod: 5,
      jokerBonus: 15,
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

  it('builds lifecycle copy from central lock state without combining competitions', () => {
    const original = buildPlayerInsightLifecycle({
      competitionKey: 'original',
      lifecycle: { locked: false, tournamentStarted: false },
      insightState: 'protected',
    })
    const ko = buildPlayerInsightLifecycle({
      competitionKey: 'ko_predictor',
      lifecycle: { locked: true, tournamentStarted: true },
      insightState: 'scored',
    })

    expect(original.copy).toContain('global prediction lock')
    expect(original.copy).toContain('You only see picks that are available for this player right now')
    expect(ko.copy).toContain('real knockout fixtures only')
    expect(ko.copy).toContain('Original Predictor points are shown separately')
  })

})