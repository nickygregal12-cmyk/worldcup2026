import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerQuickView from '../PlayerQuickView.jsx'

const player = {
  userId: 'amy', displayName: 'Amy', rank: 2, totalPoints: 42,
  memberRole: 'member', isCurrentUser: false,
}

describe('PlayerQuickView', () => {
  it('offers profile, points, head-to-head and bracket routes from a league row', () => {
    const html = renderToStaticMarkup(<PlayerQuickView player={player} competitionKey="original" onClose={() => {}} />)
    expect(html).toContain('View full profile')
    expect(html).toContain('Points breakdown')
    expect(html).toContain('Head-to-head')
    expect(html).toContain('Bracket and health')
    expect(html).toContain('tab=headToHead')
    expect(html).toContain('Points already earned remain visible for fairness')
  })

  it('keeps KO quick view free of an Original bracket action', () => {
    const html = renderToStaticMarkup(<PlayerQuickView player={player} competitionKey="ko_predictor" onClose={() => {}} />)
    expect(html).toContain('Head-to-head')
    expect(html).not.toContain('Bracket and health')
  })
})
