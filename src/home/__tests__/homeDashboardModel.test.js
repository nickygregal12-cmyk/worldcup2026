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
    homeTeamId: index < 3 ? `home-${index + 37}` : null,
    awayTeamId: index < 3 ? `away-${index + 37}` : null,
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
    now: new Date('2026-07-03T12:00:00Z'),
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
        myPoints: { original: { totalPoints: 40 }, koPredictor: { totalPoints: 15 } },
        leaderboards: {
          original: [{ userId: 'leader', rank: 1, totalPoints: 55 }, { userId: 'user-1', rank: 2, totalPoints: 40 }],
          koPredictor: [{ userId: 'leader', rank: 1, totalPoints: 25 }, { userId: 'user-1', rank: 4, totalPoints: 15 }],
        },
      },
      leagues: [{ memberCount: 6 }, { memberCount: 4 }],
    })

    expect(dashboard.displayName).toBe('Nicky')
    expect(dashboard.original.totalComplete).toBe(2)
    expect(dashboard.original.points).toBe(40)
    expect(dashboard.original.rank).toBe(2)
    expect(dashboard.original.pointsBehindLeader).toBe(15)
    expect(dashboard.original.pointsToNextScore).toBe(15)
    expect(dashboard.original.jokerCount).toBe(1)
    expect(dashboard.koPredictor.complete).toBe(1)
    expect(dashboard.koPredictor.points).toBe(15)
    expect(dashboard.koPredictor.rank).toBe(4)
    expect(dashboard.koPredictor.pointsBehindLeader).toBe(10)
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

  it('drives Home countdowns from the central lifecycle configuration', () => {
    const dashboard = makeDashboard()

    expect(dashboard.lifecycle.phase).toBe('build')
    expect(dashboard.lifecycle.predictionLockAt).toBe('2028-06-09T19:00:00.000Z')
    expect(dashboard.lifecycle.tournamentStartAt).toBe('2028-06-09T20:00:00.000Z')
    expect(dashboard.lifecycle.predictionLockCountdown).toContain('707 days')
    expect(dashboard.lifecycle.tournamentStartCountdown).toContain('707 days')
  })

  it('surfaces a central KO readiness signal for Home instead of re-deriving copy locally', () => {
    const dashboard = makeDashboard()

    expect(dashboard.koReadiness).toEqual(expect.objectContaining({
      open: true,
      available: 3,
      label: '3 real knockout fixtures ready',
      tone: 'info',
      phase: 'ko_early_access',
      showInMore: true,
      primaryReady: false,
    }))
    expect(dashboard.koReadiness.availableKoMatches.map(match => match.matchNumber)).toEqual([37, 38, 39])
    expect(dashboard.koPredictor.available).toBe(3)
  })

  it('marks Home as live and promotes the active match during tournament play', () => {
    const dashboard = makeDashboard({
      now: new Date('2028-06-10T19:30:00Z'),
      results: {
        live: {
          summary: { liveMatches: 1, confirmedMatches: 0 },
          results: [{ matchNumber: 2, status: 'live' }],
        },
      },
    })

    expect(dashboard.lifecycle.phase).toBe('live')
    expect(dashboard.live.nextMatch.matchNumber).toBe(2)
    expect(dashboard.live.nextMatch.displayStatus).toBe('live')
    expect(dashboard.live.matchHub).toEqual(expect.objectContaining({
      matchNumber: 2,
      state: 'live',
      href: '#/match-centre?match=2&competition=original',
      cta: 'Open live Match Centre',
    }))
  })

  it('routes the next knockout fixture into KO Predictor Match Centre context', () => {
    const dashboard = makeDashboard({
      results: {
        live: {
          summary: { liveMatches: 0, confirmedMatches: 36 },
          results: Array.from({ length: 36 }, (_, index) => ({
            matchNumber: index + 1,
            status: 'completed',
          })),
        },
      },
    })

    expect(dashboard.live.nextMatch.matchNumber).toBe(37)
    expect(dashboard.live.matchHub).toEqual(expect.objectContaining({
      matchNumber: 37,
      state: 'upcoming',
      href: '#/match-centre?match=37&competition=ko_predictor',
      cta: 'Open Match Centre',
    }))
  })

  it('hides the match hub when live result data is unavailable', () => {
    const dashboard = makeDashboard({
      sectionErrors: {
        results: 'Results request failed',
      },
    })

    expect(dashboard.live.dataAvailable).toBe(false)
    expect(dashboard.live.matchHub).toBeNull()
  })

})
