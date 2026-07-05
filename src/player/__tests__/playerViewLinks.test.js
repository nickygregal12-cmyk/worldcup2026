import { describe, expect, it } from 'vitest'
import { buildPlayerViewHref, normalisePlayerViewCompetition } from '../playerViewLinks.js'

describe('player view links', () => {
  it('builds Original Player View links with a member id', () => {
    expect(buildPlayerViewHref({ userId: 'player-1', competitionKey: 'original' }))
      .toBe('#/player?user=player-1&competition=original')
  })

  it('normalises KO Predictor link keys', () => {
    expect(normalisePlayerViewCompetition('koPredictor')).toBe('ko_predictor')
    expect(buildPlayerViewHref({ userId: 'player-2', competitionKey: 'koPredictor' }))
      .toBe('#/player?user=player-2&competition=ko_predictor')
  })

  it('falls back to self Player View without a member id', () => {
    expect(buildPlayerViewHref({ competitionKey: 'combined' }))
      .toBe('#/player?competition=original')
  })
})
