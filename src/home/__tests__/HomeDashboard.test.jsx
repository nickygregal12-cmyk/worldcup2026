import React from 'react' // eslint-disable-line no-unused-vars -- React is required for JSX under the current lint config
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HomeDashboard from '../HomeDashboard.jsx'
import { buildHomeDashboard } from '../homeDashboardModel.js'

const tournament = {
  name: 'UEFA EURO 2028',
  starts_on: '2028-06-09',
  ends_on: '2028-07-09',
  prediction_lock_at: null,
  prediction_locked_at: null,
}

function referenceWith(groupMatches) {
  return {
    groupMatches,
    knockoutMatches: [],
    teamsById: {
      'team-sco': { label: 'Scotland', fifaCode: 'SCO', actualTeamId: 'sco', isProvisional: false },
      'team-ger': { label: 'Germany', fifaCode: 'GER', actualTeamId: 'ger', isProvisional: false },
    },
  }
}

const openingMatch = {
  matchNumber: 1,
  matchId: 'm1',
  groupCode: 'A',
  kickoffAt: '2028-06-09T19:00:00Z',
  venueName: 'Hampden Park',
  homeTeamId: 'team-sco',
  awayTeamId: 'team-ger',
}

function fixtureFor({ now, results = null, reference = referenceWith([openingMatch]), originalBundle }) {
  return buildHomeDashboard({
    tournament,
    reference,
    session: { user: { id: 'user-1' } },
    profile: { display_name: 'Nicky' },
    guestSummary: { groupComplete: 0, bracketComplete: 0, groupJokers: 0 },
    originalBundle: originalBundle ?? { predictions: [{ prediction_kind: 'group_score', match_id: 'm1', home_score_90: 2, away_score_90: 1 }] },
    koBundle: null,
    results,
    leagues: [],
    sectionErrors: {},
    now,
  })
}

/** Full group + bracket coverage against the single-match reference above. */
function bundleFor({ groups, bracket }) {
  return {
    predictions: [
      ...Array.from({ length: groups }, () => ({ prediction_kind: 'group_score', home_score_90: 1, away_score_90: 0 })),
      ...Array.from({ length: bracket }, () => ({ prediction_kind: 'bracket_pick', advancing_tournament_team_id: 'team-sco' })),
    ],
  }
}

function renderHome(fixture) {
  return renderToStaticMarkup(
    <HomeDashboard fixture={fixture} sessionState={{ status: 'ready', session: { user: { id: 'user-1' } }, profile: null }} />,
  )
}

describe('Home dashboard rendering', () => {
  it('shows exactly one countdown before the tournament, framed as the lock', () => {
    const html = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z') }))

    expect(html).toContain('Predictions lock at kick-off')
    expect(html.match(/Days/g)).toHaveLength(1)
    expect(html).not.toContain('Tournament starts')
    expect(html).toContain('How scoring works')
  })

  it('renders the countdown sub-line at 8pm UK, the moment the lock lands', () => {
    const html = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z') }))

    expect(html).toContain('8:00pm')
    expect(html).not.toContain('9:00pm')
  })

  it('makes the featured match a real link into Match Centre with a visible hint', () => {
    const html = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z') }))

    expect(html).toContain('href="#/match-centre?match=1&amp;competition=original"')
    expect(html).toContain('Match Centre')
    expect(html).toContain('You predicted 2–1')
  })

  it('never nests a button inside the tappable match-card link', () => {
    const html = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z') }))
    const card = html.slice(html.indexOf('match-card--tappable'))
    const link = card.slice(0, card.indexOf('</a>'))

    expect(link).not.toContain('<button')
  })

  describe('prediction CTA routing', () => {
    const preTournament = new Date('2028-06-07T17:30:00Z')
    const withKnockout = {
      ...referenceWith([openingMatch]),
      knockoutMatches: [{ matchNumber: 37, matchId: 'k37' }],
    }

    it('routes to Groups while group scores are still missing', () => {
      const html = renderHome(fixtureFor({ now: preTournament, reference: withKnockout, originalBundle: bundleFor({ groups: 0, bracket: 0 }) }))
      const cta = html.slice(html.indexOf('ui-button'))

      expect(cta).toContain('href="#/groups"')
      expect(html).toContain('Start your predictions')
    })

    it('routes to Bracket once Groups is complete but Bracket is not', () => {
      const html = renderHome(fixtureFor({ now: preTournament, reference: withKnockout, originalBundle: bundleFor({ groups: 1, bracket: 0 }) }))

      expect(html).toContain('href="#/bracket"')
      expect(html).toContain('Finish your predictions')
      expect(html).not.toContain('href="#/groups"')
    })

    it('withdraws the CTA once every stage that exists is complete', () => {
      const html = renderHome(fixtureFor({ now: preTournament, reference: withKnockout, originalBundle: bundleFor({ groups: 1, bracket: 1 }) }))

      expect(html).toContain('All predictions in')
      expect(html).not.toContain('Finish your predictions')
      expect(html).not.toContain('href="#/bracket"')
    })

    it('keeps the "How scoring works" link in every CTA state', () => {
      const done = renderHome(fixtureFor({ now: preTournament, reference: withKnockout, originalBundle: bundleFor({ groups: 1, bracket: 1 }) }))
      const todo = renderHome(fixtureFor({ now: preTournament, reference: withKnockout, originalBundle: bundleFor({ groups: 0, bracket: 0 }) }))

      expect(done).toContain('How scoring works')
      expect(todo).toContain('How scoring works')
    })
  })

  it('drops the countdown entirely on a live matchday', () => {
    const html = renderHome(fixtureFor({
      now: new Date('2028-06-09T19:30:00Z'),
      results: { live: { summary: {}, results: [{ matchNumber: 1, status: 'live' }] } },
    }))

    expect(html).toContain('Today at the Euros')
    expect(html).toContain('LIVE')
    expect(html).not.toContain('Predictions lock at kick-off')
    expect(html).not.toContain('Days')
  })

  it('shows the day’s results and a tomorrow teaser after the football finishes', () => {
    const reference = referenceWith([
      openingMatch,
      { matchNumber: 2, matchId: 'm2', kickoffAt: '2028-06-10T14:00:00Z', homeTeamId: 'team-sco', awayTeamId: 'team-ger' },
    ])
    const html = renderHome(fixtureFor({
      now: new Date('2028-06-09T22:30:00Z'),
      reference,
      results: { live: { summary: {}, results: [{ matchNumber: 1, status: 'completed', home_score_90: 2, away_score_90: 0 }] } },
    }))

    expect(html).toContain('Today’s results')
    expect(html).toContain('2 – 0')
    expect(html).toContain('Your day')
    expect(html).toContain('1 match')
    expect(html).not.toContain('Predictions lock at kick-off')
  })
})
