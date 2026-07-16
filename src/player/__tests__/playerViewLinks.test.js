import { describe, expect, it } from 'vitest'
import { buildPlayerViewHref, normalisePlayerViewCompetition, normalisePlayerViewTab } from '../playerViewLinks.js'

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

  it('deep-links to full-profile breakdown sections safely', () => {
    expect(buildPlayerViewHref({ userId: 'player-2', competitionKey: 'original', tab: 'points' }))
      .toBe('#/player?user=player-2&competition=original&tab=points')
    expect(normalisePlayerViewTab('headToHead')).toBe('headToHead')
    expect(normalisePlayerViewTab('private-data')).toBe('predictions')
  })
})
