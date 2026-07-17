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

function fixtureFor({ now, results = null, reference = referenceWith([openingMatch]), originalBundle, session = { user: { id: 'user-1' } }, leagues = [] }) {
  return buildHomeDashboard({
    tournament,
    reference,
    session,
    profile: { display_name: 'Nicky' },
    guestSummary: { groupComplete: 0, bracketComplete: 0, groupJokers: 0 },
    originalBundle: originalBundle ?? { predictions: [{ prediction_kind: 'group_score', match_id: 'm1', home_score_90: 2, away_score_90: 1 }] },
    koBundle: null,
    results,
    leagues,
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

/** What the visitor actually reads, with the emphasis markup taken back out. */
function renderedText(html) {
  return html.replace(/<[^>]+>/g, '')
}

describe('Home dashboard rendering', () => {
  it('labels the countdown date as provisional when the database has no lock', () => {
    // tournament above has prediction_lock_at/prediction_locked_at NULL: the client
    // must not present the central fallback as a real, configured date.
    const fixture = fixtureFor({ now: new Date('2028-06-07T17:30:00Z') })
    expect(fixture.lifecycle.provisional).toBe(true)
    expect(renderHome(fixture)).toContain('Provisional — kick-off time not confirmed')
  })

  it('presents a database-configured lock date without the provisional label', () => {
    const fixture = buildHomeDashboard({
      tournament: { ...tournament, prediction_lock_at: '2028-06-09T19:00:00Z' },
      reference: referenceWith([openingMatch]),
      session: { user: { id: 'user-1' } },
      profile: { display_name: 'Nicky' },
      guestSummary: { groupComplete: 0, bracketComplete: 0, groupJokers: 0 },
      originalBundle: { predictions: [] },
      koBundle: null,
      results: null,
      leagues: [],
      sectionErrors: {},
      now: new Date('2028-06-07T17:30:00Z'),
    })
    expect(fixture.lifecycle.provisional).toBe(false)
    expect(renderHome(fixture)).not.toContain('Provisional — kick-off time not confirmed')
  })

  it('shows exactly one countdown before the tournament, framed as the lock', () => {
    const html = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z') }))

    expect(html).toContain('Predictions lock at kick-off')
    expect(html.match(/Days/g)).toHaveLength(1)
    expect(html).not.toContain('Tournament starts')
    expect(html).toContain('How scoring works')
  })

  it('puts rank and leagues before the countdown in the signed-in phone reading order', () => {
    const html = renderHome(fixtureFor({
      now: new Date('2028-06-07T17:30:00Z'),
      leagues: [{ memberCount: 8 }],
    }))

    expect(html.indexOf('aria-label="Your rank and leagues"')).toBeLessThan(html.indexOf('Countdown to prediction lock'))
    expect(html).toContain('Share or manage leagues')
  })

  it('keeps a quiet KO Predictor explainer before any real knockout fixture is ready', () => {
    const html = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z') }))

    expect(html).toContain('KO Predictor')
    expect(html).toContain('A separate bonus game')
    expect(html).not.toContain('ready to predict')
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
    // The ticket card emphasises the score, so assert what is read, not the markup.
    expect(renderedText(html)).toContain('You predicted 2–1')
  })

  it('never nests a button inside the tappable fixture-card link', () => {
    const html = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z') }))
    // Anchor on the Match Centre route: the whole ticket is one link, so anything
    // interactive inside it would be illegal nesting. The team badge is an image
    // and the team name is text precisely so that stays true.
    const start = html.indexOf('href="#/match-centre')
    expect(start).toBeGreaterThan(-1)
    const link = html.slice(start, html.indexOf('</a>', start))

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

      // The CTA is the only thing on Home that links to Groups — the sibling
      // cases below prove it by asserting the route disappears with the CTA.
      expect(html).toContain('href="#/groups"')
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

  it('offers leaderboard access from every state, including pre-tournament', () => {
    const pre = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z') }))
    const live = renderHome(fixtureFor({
      now: new Date('2028-06-09T19:30:00Z'),
      results: { live: { summary: {}, results: [{ matchNumber: 1, status: 'live' }] } },
    }))

    // The pre-tournament state has no rank strip, so without a standalone link
    // Home would offer no route to the leaderboards in the state everyone sees.
    expect(pre).toContain('#/leaderboards?competition=original')
    expect(live).toContain('#/leaderboards?competition=original')
  })

  it('keeps KO leaderboard access quiet until the KO game becomes primary', () => {
    const preDashboard = fixtureFor({ now: new Date('2028-06-07T17:30:00Z') })
    const primaryDashboard = {
      ...preDashboard,
      koReadiness: { ...preDashboard.koReadiness, open: true, earlyAccess: true, primaryReady: true },
    }
    const pre = renderHome(preDashboard)
    const primary = renderHome(primaryDashboard)

    expect(pre).toContain('#/leaderboards?competition=original')
    expect(pre).not.toContain('#/leaderboards?competition=koPredictor')
    expect(primary).toContain('#/leaderboards?competition=original')
    expect(primary).toContain('#/leaderboards?competition=koPredictor')
  })

  it('withholds the rank strip from a signed-out visitor while keeping Original standings findable', () => {
    const pre = renderHome(fixtureFor({ now: new Date('2028-06-07T17:30:00Z'), session: null }))

    // A guest has no rank to show. The rank strip is the only thing that labels a
    // cell "Open full leaderboard", so its absence proves the strip is gone while
    // the Leaderboards card still carries the access.
    expect(pre).not.toContain('Open full leaderboard')
    expect(pre).toContain('#/leaderboards?competition=original')
    expect(pre).not.toContain('#/leaderboards?competition=koPredictor')
    expect(pre).toContain('Sign in during this preview')
  })

  describe('team badges', () => {
    const preTournament = new Date('2028-06-07T17:30:00Z')

    it('renders a circular ISO badge for each team, never a letter avatar', () => {
      const html = renderHome(fixtureFor({ now: preTournament }))

      // Two teams, two flag images. The letter-avatar fallback TeamLabel reaches
      // for when a slot is unresolved must never appear on Home.
      expect(html).toContain('data:image/svg+xml')
      expect(html.match(/<img/g)).toHaveLength(2)
    })

    it('gives an unresolved slot the neutral dashed chip, not a guessed flag or initials', () => {
      const reference = {
        ...referenceWith([openingMatch]),
        teamsById: {
          'team-sco': { label: 'Scotland', fifaCode: 'SCO', actualTeamId: 'sco', isProvisional: false },
          'team-ger': { label: 'Germany', fifaCode: 'GER', actualTeamId: null, isProvisional: true },
        },
      }
      const html = renderHome(fixtureFor({ now: preTournament, reference }))

      // Exactly one flag: the resolved side. The provisional side gets the neutral
      // placeholder, which carries no image and no letters.
      expect(html.match(/<img/g)).toHaveLength(1)
    })
  })

  describe('the hero names no teams', () => {
    const preTournament = new Date('2028-06-07T17:30:00Z')
    const heroOf = html => html.slice(0, html.indexOf('</section>'))

    // The hero used to carry a title that named both teams, but only when both
    // read as resolved — a stricter condition than the card below it applied. So
    // the hero said "Match 1" while the card said "Scotland v Germany" from the
    // same data. The teams now live on the card alone: one surface, one answer.
    it('identifies the match, not the participants, whether or not they resolve', () => {
      const resolved = renderHome(fixtureFor({ now: preTournament }))
      const provisional = renderHome(fixtureFor({
        now: preTournament,
        reference: {
          ...referenceWith([openingMatch]),
          teamsById: {
            'team-sco': { label: 'Scotland', fifaCode: 'SCO', actualTeamId: null, isProvisional: true },
            'team-ger': { label: 'Germany', fifaCode: 'GER', actualTeamId: null, isProvisional: true },
          },
        },
      }))

      for (const html of [resolved, provisional]) {
        expect(heroOf(html)).toContain('Match 1')
        expect(heroOf(html)).not.toContain('Scotland')
        expect(heroOf(html)).not.toContain('Germany')
      }
      // …and the card names them in both cases, so the two can no longer disagree.
      expect(resolved).toContain('Scotland')
      expect(provisional).toContain('Scotland')
    })
  })

  describe('signed out', () => {
    const preTournament = new Date('2028-06-07T17:30:00Z')

    const secondMatch = { matchNumber: 2, matchId: 'm2', groupCode: 'A', kickoffAt: '2028-06-10T14:00:00Z', homeTeamId: 'team-sco', awayTeamId: 'team-ger' }
    const twoGroupMatches = referenceWith([openingMatch, secondMatch])

    const guestHome = guestSummary => buildHomeDashboard({
      tournament,
      reference: twoGroupMatches,
      session: null,
      profile: null,
      guestSummary,
      originalBundle: null,
      koBundle: null,
      results: null,
      leagues: [],
      sectionErrors: {},
      now: preTournament,
    })

    it('invites a first-time visitor to open an account, counting the real fixtures', () => {
      const html = renderHome(guestHome({ groupComplete: 0, bracketComplete: 0, groupJokers: 0 }))

      expect(html).toContain('Create an account')
      // The totals render from the reference data, never from hardcoded prose.
      expect(renderedText(html)).toContain('Predict all 2 matches')
      expect(renderedText(html)).toContain('all 2 group matches')
    })

    it('keeps a guest’s browser progress and their route back into it', () => {
      // A guest who has already predicted in this browser must not be handed an
      // empty invitation: the work is real, and Home has always carried it. The
      // prototype's signed-out state draws a first-time visitor only.
      const html = renderHome(guestHome({ groupComplete: 1, bracketComplete: 0, groupJokers: 0 }))

      expect(renderedText(html)).toContain('Your predictions')
      expect(html).toContain('href="#/groups"')
      expect(html).toContain('Create an account')
    })
  })

  describe('a failed section shows a dash, never a false zero', () => {
    const preTournament = new Date('2028-06-07T17:30:00Z')

    const withErrors = sectionErrors => buildHomeDashboard({
      tournament,
      reference: referenceWith([openingMatch]),
      session: { user: { id: 'user-1' } },
      profile: { display_name: 'Nicky' },
      guestSummary: { groupComplete: 0, bracketComplete: 0, groupJokers: 0 },
      originalBundle: { predictions: [] },
      koBundle: null,
      results: null,
      leagues: null,
      sectionErrors,
      now: preTournament,
    })

    it('dashes the points and rank tiles when the leaderboard fetch fails', () => {
      // points and rank come from `results`, NOT from the prediction bundle, so
      // gating them on original.dataAvailable would print a confident "0" to a
      // user whose leaderboard call failed. Home's own banner promises otherwise.
      const text = renderedText(renderHome(withErrors({ results: 'offline' })))

      expect(text).toContain('—')
      expect(text).not.toMatch(/0\s*Points/)
    })

    it('never tells a league member they have no leagues because the fetch failed', () => {
      const text = renderedText(renderHome(withErrors({ leagues: 'offline' })))

      expect(text).not.toContain('Create or join a league')
      expect(text).toContain('could not be loaded')
    })

    it('still prints a genuine zero when the data really did load', () => {
      const text = renderedText(renderHome(withErrors({})))

      expect(text).toContain('Create or join a league')
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

  it('tells how each finished pick went without inventing a points figure', () => {
    // The re-cut prototype prints a per-match points chip ("Exact +5") and a
    // "+8 pts today" total. Neither has a data source — the result columns carry
    // no per-match points and the model refuses to fabricate them. The outcome
    // itself IS derivable from the predicted and actual scores, so Home says that
    // and stops there. Reported to the owner rather than resolved by guessing.
    const html = renderHome(fixtureFor({
      now: new Date('2028-06-09T22:30:00Z'),
      results: { live: { summary: {}, results: [{ matchNumber: 1, status: 'completed', home_score_90: 2, away_score_90: 1 }] } },
    }))
    const text = renderedText(html)

    expect(text).toContain('You predicted 2–1 · exact score')
    expect(text).toContain('1 exact')
    expect(text).not.toMatch(/\+\d+\s*pts today/)
    expect(text).not.toMatch(/Exact \+\d/)
  })
})
