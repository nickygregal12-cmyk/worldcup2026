import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import OriginalBracketHealth from '../OriginalBracketHealth.jsx'

const model = {
  status: 'ready',
  provisional: false,
  projection: { groupsReadyCount: 6, groupsTotal: 6, allGroupsReady: true },
  rounds: [{ key: 'round_of_16', label: 'Round of 16', alive: 7, total: 8, out: 1, securedPoints: 20, remainingPoints: 60, healthPercent: 88 }],
  cards: [],
}

describe('OriginalBracketHealth profile context', () => {
  it('names the viewed player when bracket health is opened from their profile', () => {
    const html = renderToStaticMarkup(<OriginalBracketHealth reference={{ teamsById: {} }} preview={{}} liveSnapshot={{}} model={model} subjectLabel="Amy’s" />)
    expect(html).toContain('Amy’s Original bracket health')
    expect(html).toContain('Amy’s saved bracket never changes')
  })

  it('explains why health is waiting before live projections are meaningful', () => {
    const html = renderToStaticMarkup(<OriginalBracketHealth reference={{}} preview={{}} liveSnapshot={{}} model={{ status: 'pending' }} />)
    expect(html).toContain('Bracket health appears once the live group tables')
  })
})
