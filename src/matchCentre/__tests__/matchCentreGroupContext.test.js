import { describe, expect, it } from 'vitest'
import { buildGroupMatchCentreContext } from '../matchCentreModel.js'

describe('buildGroupMatchCentreContext', () => {
  it('builds a read-only group projection and prediction comparison for group fixtures', () => {
    const context = buildGroupMatchCentreContext({
      fixture: {
        matchNumber: 4,
        groupCode: 'A',
        state: 'live',
        score: '1–0',
      },
      liveSnapshot: {
        groups: {
          A: {
            completedMatchCount: 2,
            rows: [
              { teamId: 'team-scotland', label: 'Scotland', rank: 1, played: 2, points: 6, goalDifference: 3, goalsFor: 4 },
              { teamId: 'team-ireland', label: 'Ireland', rank: 2, played: 2, points: 3, goalDifference: 0, goalsFor: 2 },
            ],
          },
        },
      },
      impact: {
        lines: [
          { userId: 'u1', displayName: 'Nicky', isCurrentUser: true, rank: 1, totalPoints: 30, visibility: 'visible', score: '1–0', jokerApplied: true, maximumPoints: 60 },
          { userId: 'u2', displayName: 'Player Two', isCurrentUser: false, rank: 2, totalPoints: 10, visibility: 'visible', score: '2–1', jokerApplied: false, maximumPoints: 30 },
          { userId: 'u3', displayName: 'Player Three', isCurrentUser: false, rank: 3, totalPoints: 0, visibility: 'private', reason: 'Protected', maximumPoints: 0 },
        ],
      },
    })

    expect(context.fixtureKind).toBe('group')
    expect(context.projection.rows).toHaveLength(2)
    expect(context.predictionComparison.summary).toMatchObject({
      visibleCount: 2,
      exactCount: 1,
      outcomeCount: 1,
      differentCount: 0,
    })
  })

  it('does not create group context for knockout fixtures', () => {
    expect(buildGroupMatchCentreContext({
      fixture: { matchNumber: 37, state: 'upcoming' },
      liveSnapshot: {},
      impact: null,
    })).toBeNull()
  })
})
