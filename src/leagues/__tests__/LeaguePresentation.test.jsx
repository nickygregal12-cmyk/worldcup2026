import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LeaderList } from '../LeaguePresentation.jsx'

const rows = [
  { userId: 'other', displayName: 'Dougie', rank: 1, totalPoints: 40, isCurrentUser: false },
  { userId: 'me', displayName: 'Nicky', rank: 2, totalPoints: 30, isCurrentUser: true },
]

describe('league standings rows', () => {
  it('makes every member row, including your own, open a Player View', () => {
    const html = renderToStaticMarkup(<LeaderList rows={rows} onOpenPlayer={() => {}} />)

    expect(html).toContain('Open your Player View')
    expect(html).toContain("Open Dougie&#x27;s Player View")
    expect(html.match(/<button/g)).toHaveLength(2)
  })
})
