import { describe, expect, it } from 'vitest'
import { buildHomeDashboard } from '../homeDashboardModel.js'

const tournament = {
  name: 'UEFA EURO 2028',
  starts_on: '2028-06-09',
  ends_on: '2028-07-09',
  prediction_lock_at: null,
  prediction_locked_at: null,
}

const reference = {
  groupMatches: Array.from({ length: 36 }, (_, index) => ({ matchNumber: index + 1 })),
  knockoutMatches: Array.from({ length: 15 }, (_, index) => ({
    matchNumber: index + 37,
    participantsResolved: index < 3,
  })),
  teamsById: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [
    `team-${index + 1}`,
    { isProvisional: true, actualTeamId: null },
  ])),
}

function makeDashboard(overrides = {}) {
  return buildHomeDashboard({
    tournament,
    reference,
    session: null,
    profile: null,
    guestSummary: { groupComplete: 7, bracketComplete: 2, groupJokers: 1 },
    originalBundle: null,
    koBundle: null,
    results: null,
    leagues: [],
    sectionErrors: {},
    ...overrides,
  })
}

describe('Home dashboard model', () => {
  it('keeps browser-only guest progress separate from scored account data', () => {
    const dashboard = makeDashboard()

    expect(dashboard.signedIn).toBe(false)
    expect(dashboard.original.groupComplete).toBe(7)
    expect(dashboard.original.bracketComplete).toBe(2)
    expect(dashboard.original.points).toBeNull()
    expect(dashboard.koPredictor.points).toBeNull()
    expect(dashboard.leagues.count).toBe(0)
  })

  it('keeps Original and KO Predictor totals, points and jokers separate', () => {
    const dashboard = makeDashboard({
      session: { user: { id: 'user-1', email: 'nicky@example.com' } },
      profile: { display_name: 'Nicky' },
      originalBundle: {
        predictions: [
          { prediction_kind: 'group_score', home_score_90: 2, away_score_90: 1, joker_applied: true },
          { prediction_kind: 'bracket_pick', advancing_tournament_team_id: 'team-1', joker_applied: false },
        ],
      },
      koBundle: {
        predictions: [
          { home_score_90: 1, away_score_90: 1, advancing_tournament_team_id: 'team-2', decision_method: 'penalties', joker_applied: true },
        ],
      },
      results: {
        myPoints: { original: { total_points: 40 }, koPredictor: { total_points: 15 } },
        leaderboards: {
          original: [{ userId: 'user-1', rank: 2 }],
          koPredictor: [{ userId: 'user-1', rank: 4 }],
        },
      },
      leagues: [{ memberCount: 6 }, { memberCount: 4 }],
    })

    expect(dashboard.displayName).toBe('Nicky')
    expect(dashboard.original.totalComplete).toBe(2)
    expect(dashboard.original.points).toBe(40)
    expect(dashboard.original.rank).toBe(2)
    expect(dashboard.original.jokerCount).toBe(1)
    expect(dashboard.koPredictor.complete).toBe(1)
    expect(dashboard.koPredictor.points).toBe(15)
    expect(dashboard.koPredictor.rank).toBe(4)
    expect(dashboard.koPredictor.jokerCount).toBe(1)
    expect(dashboard.leagues).toEqual({ count: 2, members: 10 })
  })

  it('marks failed sections unavailable instead of presenting genuine zeroes', () => {
    const dashboard = makeDashboard({
      session: { user: { id: 'user-1', email: 'nicky@example.com' } },
      sectionErrors: {
        original: 'Prediction request failed',
        koPredictor: 'KO request failed',
        results: 'Results request failed',
      },
    })

    expect(dashboard.hasPartialFailure).toBe(true)
    expect(dashboard.original.dataAvailable).toBe(false)
    expect(dashboard.koPredictor.dataAvailable).toBe(false)
    expect(dashboard.live.dataAvailable).toBe(false)
  })
})
