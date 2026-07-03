import React from 'react' // eslint-disable-line no-unused-vars
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import PlayerInsight from '../PlayerInsight.jsx'

describe('PlayerInsight', () => {
  it('renders an Original points story with canonical evidence and provisional team treatment', () => {
    const section = {
      status: 'ready',
      error: null,
      data: {
        state: 'scored', memberUserId: 'me', displayName: 'Nicky', totalPoints: 50, scoredMatchCount: 1,
        matchBreakdown: [{
          matchId: 'm1', matchNumber: 1, matchday: 1, stageLabel: 'Group A', totalPoints: 30,
          exactScorePoints: 30, correctOutcomePoints: 0, advancingTeamPoints: 0,
          decisionMethodPoints: 0, jokerMultiplier: 1, jokerBonus: 0, corrected: true, resultRevision: 2,
        }],
        bracketBreakdown: [{
          milestone: 'champion', tournamentTeamId: 'team-1', teamLabel: 'Scotland',
          team: { label: 'Scotland', isoCode: 'SCO', isProvisional: true }, points: 20,
        }],
      },
    }
    const html = renderToStaticMarkup(
      <PlayerInsight
        section={section}
        leaderboardRows={[{ userId: 'me', rank: 2, totalPoints: 50 }, { userId: 'leader', rank: 1, totalPoints: 60 }]}
        player={{ userId: 'me', displayName: 'Nicky', isCurrentUser: true }}
        competitionKey="original"
        lifecycle={{ locked: true, tournamentStarted: true }}
      />,
    )

    expect(html).toContain('How the total was earned')
    expect(html).toContain('Original points only')
    expect(html).toContain('10 pts')
    expect(html).toContain('Corrected result revision 2')
    expect(html).toContain('Scotland')
    expect(html).toContain('Provisional')
    expect(html).not.toContain('group positions')
    expect(html).not.toContain('combined total')
  })

  it('does not expose protected point evidence', () => {
    const html = renderToStaticMarkup(
      <PlayerInsight
        section={{ status: 'ready', error: null, data: { state: 'protected', reason: 'Private until lock.', totalPoints: 0 } }}
        leaderboardRows={[]}
        player={{ userId: 'other', displayName: 'Amy' }}
        competitionKey="original"
        lifecycle={{ locked: false, tournamentStarted: false }}
      />,
    )
    expect(html).toContain('Private until lock.')
    expect(html).toContain('Only selections released by the existing server privacy rules are shown')
    expect(html).not.toContain('How the total was earned')
  })
})
