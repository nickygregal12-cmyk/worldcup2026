import { describe, expect, it } from 'vitest'
import { APP_ROUTE, destinationForRoute, leaderboardCompetitionFromHash, LEADERBOARD_COMPETITION, normaliseHashPath, routeFromHash } from '../appRoutes.js'

describe('Euro app routes', () => {
  it('normalises hashes without depending on a server-side router', () => {
    expect(normaliseHashPath('#predict/')).toBe('/predict')
    expect(normaliseHashPath('#/ko-predictor?match=37')).toBe('/ko-predictor')
    expect(normaliseHashPath('')).toBe('/')
  })

  it('supports the intentional route aliases', () => {
    expect(routeFromHash('#/groups')).toBe(APP_ROUTE.PREDICT)
    expect(routeFromHash('#/predictions')).toBe(APP_ROUTE.PREDICT)
    expect(routeFromHash('#/group-stage-review')).toBe(APP_ROUTE.PREDICT)
    expect(routeFromHash('#/bracket')).toBe(APP_ROUTE.BRACKET)
    expect(routeFromHash('#/ko')).toBe(APP_ROUTE.KO_PREDICTOR)
    expect(routeFromHash('#/leaderboards')).toBe(APP_ROUTE.LEADERBOARDS)
    expect(routeFromHash('#/standings')).toBe(APP_ROUTE.LEADERBOARDS)
    expect(routeFromHash('#/rankings')).toBe(APP_ROUTE.LEADERBOARDS)
  })

  it('keeps Results and Leaderboards as separate destinations', () => {
    expect(destinationForRoute(APP_ROUTE.RESULTS)).toMatchObject({ label: 'Results', hash: '#/results' })
    expect(destinationForRoute(APP_ROUTE.LEADERBOARDS)).toMatchObject({ label: 'Leaderboards', hash: '#/leaderboards' })
  })

  it('selects the requested leaderboard competition safely', () => {
    expect(leaderboardCompetitionFromHash('#/leaderboards?competition=koPredictor')).toBe(LEADERBOARD_COMPETITION.KO_PREDICTOR)
    expect(leaderboardCompetitionFromHash('#/leaderboards?competition=original')).toBe(LEADERBOARD_COMPETITION.ORIGINAL)
    expect(leaderboardCompetitionFromHash('#/leaderboards?competition=combined')).toBe(LEADERBOARD_COMPETITION.ORIGINAL)
  })

  it('keeps Bracket and KO as permanently separate destinations', () => {
    expect(destinationForRoute(APP_ROUTE.BRACKET)).toMatchObject({ label: 'Bracket', hash: '#/bracket' })
    expect(destinationForRoute(APP_ROUTE.KO_PREDICTOR)).toMatchObject({ label: 'KO Predictor', hash: '#/ko-predictor' })
  })

  it('falls back safely to Home for unknown destinations', () => {
    expect(routeFromHash('#/not-a-route')).toBe(APP_ROUTE.HOME)
    expect(destinationForRoute('not-a-route').key).toBe(APP_ROUTE.HOME)
  })
})
